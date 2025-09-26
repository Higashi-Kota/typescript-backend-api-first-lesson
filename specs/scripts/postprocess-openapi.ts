import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse, stringify } from "yaml";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonArray;
type JsonArray = JsonValue[];
interface JsonObject {
  [key: string]: JsonValue;
}

interface EnumConfig {
  readonly values: readonly string[];
  readonly ref: string;
}

const projectRoot = path.resolve(process.cwd());
const outputDir = path.join(projectRoot, "tsp-output", "@typespec", "openapi3", "generated");
const targetFile = path.join(outputDir, "openapi.yaml");

const enumConfigs: readonly EnumConfig[] = [
  {
    values: ["cut", "color", "perm", "treatment", "spa", "other"],
    ref: "#/components/schemas/Models.ServiceCategoryType",
  },
  {
    values: ["active", "inactive", "suspended", "deleted", "blacklisted"],
    ref: "#/components/schemas/Models.CustomerStatusType",
  },
  {
    values: ["bronze", "silver", "gold", "platinum"],
    ref: "#/components/schemas/Models.LoyaltyTierType",
  },
];

const enumLookup = new Map(
  enumConfigs.map((config) => [config.values.slice().sort().join("|"), config])
);

const schemaPathsToSkip = new Set(
  enumConfigs
    .map((config) => config.ref.split("/components/schemas/")[1])
    .filter((segment): segment is string => Boolean(segment))
    .map((segment) => `components.schemas.${segment}`)
);

let replacements = 0;

const stringifyYaml = (value: JsonValue): string =>
  stringify(value, {
    lineWidth: 0,
    indent: 2,
    sortMapEntries: false,
  });

const transformNode = (node: JsonValue, pathSegments: string[] = []): JsonValue => {
  if (Array.isArray(node)) {
    return node.map((item, index) => transformNode(item, [...pathSegments, String(index)]));
  }

  if (node && typeof node === "object") {
    const record = node as JsonObject;

    for (const key of Object.keys(record)) {
      record[key] = transformNode(record[key], [...pathSegments, key]);
    }

    const enumCandidate = record.enum;
    if (Array.isArray(enumCandidate)) {
      const sortedKey = [...enumCandidate]
        .map((value) => (typeof value === "string" ? value : String(value)))
        .sort()
        .join("|");

      const config = enumLookup.get(sortedKey);
      const currentPath = pathSegments.join(".");

      const allowedKeys = new Set(["enum", "type"]);
      const hasUnexpectedKeys = Object.keys(record).some((key) => !allowedKeys.has(key));
      const isStringEnum = record.type === undefined || record.type === "string";

      if (config && !schemaPathsToSkip.has(currentPath) && !hasUnexpectedKeys && isStringEnum) {
        replacements += 1;
        return { $ref: config.ref } satisfies JsonObject;
      }
    }
  }

  return node;
};

async function main(): Promise<void> {
  try {
    const raw = await readFile(targetFile, "utf8");
    const parsed = parse(raw) as JsonValue;
    const transformed = transformNode(parsed);

    if (replacements === 0) {
      console.warn("[postprocess-openapi] 置き換え対象の列挙スキーマは見つかりませんでした。");
      return;
    }

    await writeFile(targetFile, stringifyYaml(transformed));
    console.info(`[postprocess-openapi] 共通Enumへの参照を ${replacements} 箇所に適用しました。`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`[postprocess-openapi] 出力ファイルが見つかりませんでした: ${targetFile}`);
      return;
    }

    console.error("[postprocess-openapi] 処理中にエラーが発生しました:", error);
    process.exitCode = 1;
  }
}

void main();
