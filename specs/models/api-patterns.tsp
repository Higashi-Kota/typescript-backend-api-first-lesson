import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  /**
   * 検索API用の入力型定義のテンプレート
   * 全てのフィールドはoptional（省略可能）
   */
  @doc("Base template for search API input parameters")
  model SearchInputBase<T> {
    ...T;
  }

  /**
   * 作成API用の入力型定義のテンプレート
   * フィールドはnullable（キーは必須、値はnull許可）
   */
  @doc("Base template for create API input")
  model CreateInputBase<T> {
    ...T;
  }

  /**
   * 更新API用の入力型定義のテンプレート
   * 全てのフィールドはoptional（部分更新をサポート）
   */
  @doc("Base template for update API input")
  model UpdateInputBase<T> {
    ...T;
  }

  /**
   * 出力型（レスポンス）のテンプレート
   * 必須フィールドとnullableフィールドを明示的に定義
   */
  @doc("Base template for API output/response")
  model OutputBase<T> {
    ...T;
  }
}
