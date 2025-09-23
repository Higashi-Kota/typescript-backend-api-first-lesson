import "@typespec/http";
import "./common.tsp";

using TypeSpec.Http;

namespace BeautySalon.Models {
  @doc("権限管理におけるロール定義")
  model Role {
    @doc("ロール ID")
    id: RoleId;

    @doc("ロールのシステム内部名")
    name: string;

    @doc("管理画面などで表示する名称")
    displayName: string;

    @doc("ロールの詳細説明")
    description?: string;

    @doc("付与されている権限一覧")
    permissions: Permission[];

    @doc("システム標準ロールかどうか")
    isSystem: boolean;

    @doc("ロールが有効状態かどうか")
    isActive: boolean;

    ...AuditInfo;
  }

  @doc("操作権限の定義")
  model Permission {
    @doc("権限 ID")
    id: PermissionId;

    @doc("権限キー（例: booking.create）")
    key: string;

    @doc("権限の名称")
    name: string;

    @doc("権限の説明")
    description?: string;

    @doc("対象リソース種別")
    resource: string;

    @doc("許可する操作区分")
    action: string;

    @doc("権限の適用範囲（own/salon/all）")
    scope?: "own" | "salon" | "all";
  }

  @doc("ユーザーへのロール割当情報")
  model UserRoleAssignment {
    @doc("対象ユーザー ID（スタッフ/顧客いずれも可）")
    userId: string;

    @doc("割り当てるロール ID")
    roleId: RoleId;

    @doc("サロン単位のロールの場合の対象サロン ID")
    salonId?: SalonId;

    @doc("割当日時")
    assignedAt: utcDateTime;

    @doc("割当を実施したユーザー ID")
    assignedBy: string;

    @doc("ロール割当の有効期限")
    expiresAt?: utcDateTime;

    @doc("割当が現在有効かどうか")
    isActive: boolean;
  }

  @doc("アクセス権限の確認リクエスト")
  model AccessCheck {
    @doc("権限を判定するユーザー ID")
    userId: string;

    @doc("対象リソースの識別子")
    resource: string;

    @doc("実行したい操作区分")
    action: string;

    @doc("サロン単位での権限チェック時のサロン ID")
    salonId?: SalonId;

    @doc("リソース固有の ID")
    resourceId?: string;
  }

  @doc("アクセス権限チェックの結果")
  model AccessResult {
    @doc("操作が許可されたかどうか")
    allowed: boolean;

    @doc("拒否または許可の理由")
    reason?: string;

    @doc("必要な権限キー一覧")
    requiredPermissions?: string[];

    @doc("ユーザーが保有する権限キー一覧")
    userPermissions?: string[];
  }

  @doc("""
    システムロールタイプ区分 - システムで事前定義されたロールの種類
    
    super_admin: スーパー管理者 - システム全体へのフルアクセス権限
    salon_owner: サロンオーナー - サロン全体へのフルアクセス権限
    salon_manager: サロンマネージャー - サロンの管理業務権限
    senior_staff: シニアスタッフ - 上級スタイリスト・セラピストの権限
    staff: スタッフ - 一般スタッフの権限
    receptionist: 受付 - フロントデスク業務の権限
    customer: 顧客 - 顧客セルフサービスの権限
    guest: ゲスト - 限定的なゲストアクセス権限
    """)
  enum SystemRoleType {
    super_admin,
    salon_owner,
    salon_manager,
    senior_staff,
    staff,
    receptionist,
    customer,
    guest,
  }

  @doc("ロール新規作成時の入力モデル")
  model RoleCreateInput {
    @doc("ロールの内部名")
    name: string;

    @doc("表示用のロール名")
    displayName: string;

    @doc("ロール説明文")
    description?: string;

    @doc("付与する権限 ID リスト")
    permissions: PermissionId[];
  }

  @doc("ロール情報の更新入力モデル")
  model RoleUpdateInput {
    @doc("更新後の表示名")
    displayName?: string;

    @doc("更新後の説明文")
    description?: string;

    @doc("更新後の権限 ID リスト")
    permissions?: PermissionId[];

    @doc("有効/無効の切り替え")
    isActive?: boolean;
  }

  @doc("ユーザーへロールを割り当てる入力モデル")
  model UserRoleAssignInput {
    @doc("対象ユーザー ID")
    userId: string;

    @doc("割当対象のロール ID")
    roleId: RoleId;

    @doc("サロン単位の場合のサロン ID")
    salonId?: SalonId;

    @doc("割当の有効期限")
    expiresAt?: utcDateTime;
  }

  @doc("複数権限の保有状況を確認する入力モデル")
  model PermissionCheckInput {
    @doc("確認対象のユーザー ID")
    userId: string;

    @doc("確認したい権限キー一覧")
    permissions: string[];

    @doc("サロン単位の権限チェック時のサロン ID")
    salonId?: SalonId;
  }

  @doc("権限チェックの結果モデル")
  model PermissionCheckResult {
    @doc("確認対象のユーザー ID")
    userId: string;

    @doc("各権限の判定結果一覧")
    permissions: PermissionStatus[];
  }

  @doc("個別権限の判定結果")
  model PermissionStatus {
    @doc("権限キー")
    permission: string;

    @doc("権限が付与されているかどうか")
    granted: boolean;

    @doc("権限を付与したロール情報")
    source?: string;
  }
}
