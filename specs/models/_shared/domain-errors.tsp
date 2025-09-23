import "@typespec/http";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("""
  ドメインエラータイプ区分 - ビジネスロジック層で発生するエラーの分類

  VALIDATION_ERROR: 検証エラー - 入力値の検証で失敗
  NOT_FOUND: 未検出 - 指定されたリソースが存在しない
  ALREADY_EXISTS: 既存 - リソースが既に存在し、重複が許可されない
  BUSINESS_RULE_VIOLATION: ビジネスルール違反 - ビジネスロジックの制約に違反
  UNAUTHORIZED: 未認証 - 認証が必要であるが認証されていない
  FORBIDDEN: 禁止 - 認証されているが権限が不足
  INTERNAL_ERROR: 内部エラー - システム内部で予期しないエラーが発生
  DATABASE_ERROR: データベースエラー - データベース操作中のエラー
  EXTERNAL_SERVICE_ERROR: 外部サービスエラー - 外部APIやサービスでのエラー
  """)
  enum DomainErrorType {
    VALIDATION_ERROR: "VALIDATION_ERROR",
    NOT_FOUND: "NOT_FOUND",
    ALREADY_EXISTS: "ALREADY_EXISTS",
    BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INTERNAL_ERROR: "INTERNAL_ERROR",
    DATABASE_ERROR: "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
  }

  @doc("""
  ドメインエラーの詳細情報モデル。
  予約・顧客・サロンなどビジネスロジック層で発生したエラーを分類し、運用チームが原因分析しやすい形で保持する。
  """)
  model DomainErrorDetails {
    @doc("エラー分類タイプ。上位のビジネスルールカテゴリを特定する。")
    type: DomainErrorType;

    @doc("業務担当者が理解しやすい説明文。ユーザー通知にも使用可能。")
    message: string;

    @doc("機械判読可能なエラーコード。外部連携やログ分析に利用する。")
    code: string;

    @doc("追加のエラー文脈。入力値や関連設定など柔軟に格納する。")
    details: Record<unknown> | null;

    @doc("関連するエンティティ名。例: `Reservation` や `Customer`。")
    entity: string | null;

    @doc("問題が発生したフィールド名。入力フォームとの紐付けに利用。")
    field: string | null;

    @doc("問題があった値。マスキングが不要なケースのみ保持する。")
    value: string | null;

    @doc("外部サービスエラー時の対象サービス名。連携先の切り分けに役立つ。")
    service: string | null;
  }

  @doc("""
  ドメインエラータイプとシステム標準エラーコードの対応表モデル。
  内部ロジックとHTTPレスポンスの整合性を保つために利用する。
  """)
  model DomainErrorMapping {
    @doc("ドメインエラータイプ。ビジネス層で識別されるカテゴリ。")
    domainType: DomainErrorType;

    @doc("対応する標準エラーコード。`ErrorCodeType` を参照する。")
    errorCode: ErrorCodeType;

    @doc("レスポンスに適用する HTTP ステータスコード。")
    httpStatus: int32;
  }

  @doc("""
  ドメインエラー生成の標準設定モデル。
  各カテゴリごとの既定コードと HTTP ステータスを定義し、再利用可能なエラーファクトリーを構築する。
  """)
  model DomainErrorFactory {
    @doc("検証エラーを生成するための設定。")
    validation: {
      type: "VALIDATION_ERROR";
      defaultCode: "VALIDATION_FAILED";
      httpStatus: 400;
    };

    @doc("リソース未検出エラーを生成するための設定。")
    notFound: {
      type: "NOT_FOUND";
      defaultCode: "RESOURCE_NOT_FOUND";
      httpStatus: 404;
    };

    @doc("重複登録エラーを生成するための設定。")
    alreadyExists: {
      type: "ALREADY_EXISTS";
      defaultCode: "RESOURCE_ALREADY_EXISTS";
      httpStatus: 409;
    };

    @doc("ビジネスルール違反エラーを生成するための設定。")
    businessRule: {
      type: "BUSINESS_RULE_VIOLATION";
      defaultCode: "BUSINESS_RULE_VIOLATION";
      httpStatus: 422;
    };

    @doc("未認証エラーを生成するための設定。")
    unauthorized: {
      type: "UNAUTHORIZED";
      defaultCode: "AUTHENTICATION_REQUIRED";
      httpStatus: 401;
    };

    @doc("権限不足エラーを生成するための設定。")
    forbidden: {
      type: "FORBIDDEN";
      defaultCode: "INSUFFICIENT_PERMISSIONS";
      httpStatus: 403;
    };

    @doc("内部サーバーエラーを生成するための設定。")
    internal: {
      type: "INTERNAL_ERROR";
      defaultCode: "INTERNAL_SERVER_ERROR";
      httpStatus: 500;
    };

    @doc("データベースエラーを生成するための設定。")
    database: {
      type: "DATABASE_ERROR";
      defaultCode: "DATABASE_ERROR";
      httpStatus: 500;
    };

    @doc("外部サービス連携エラーを生成するための設定。")
    externalService: {
      type: "EXTERNAL_SERVICE_ERROR";
      defaultCode: "EXTERNAL_SERVICE_ERROR";
      httpStatus: 502;
    };
  }

  @doc("""
  ドメイン操作で発生したエラーのコンテキストモデル。
  ビジネス層の例外情報と HTTP レイヤーの問題詳細を紐づけ、ログ出力やモニタリングを容易にする。
  """)
  model DomainOperationError {
    @doc("ドメインエラーの詳細情報。ビジネスロジック層で発生した要因を保持する。")
    domainError: DomainErrorDetails;

    @doc("HTTP レスポンスとして返却可能な ProblemDetails。クライアントへの通知に使用。")
    problemDetails: ProblemDetails;

    @doc("エラーが発生した日時 (UTC)。再発防止のタイムライン分析に活用。")
    occurredAt: utcDateTime;

    @doc("エラーが発生した操作名やユースケース。例: `CreateReservation`。")
    operation: string | null;

    @doc("デバッグ用のスタックトレース。開発・検証環境のみで出力する。")
    stackTrace: string | null;
  }
}
