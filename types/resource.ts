export interface QRCode {
  id: string;
  url: string;
  options: any;
  attributes: {
    qr_code_url: string;
    qr_code_base64: string;
    external_qrcode_id: string;
  };
  created_at: string;
  scan_count: number;
  updated_at: string;
  template_id: string;
  template_name: string | null;
  msg_template_id: string | null;
}

export interface Resource {
  id: string;
  type: string;
  qrcode: QRCode;
  attributes: {
    icon: string;
    name: string | null;
    image: string;
    title: string;
    password: string | null;
    shortUrl: string;
    expiredAt: string | null;
    created_at: string;
    expiredUrl: string | null;
    expired_at: string | null;
    externalId: string;
    click_count: number;
    description: string;
    expired_url: string | null;
    originalUrl: string;
    socialPreview: {
      image: string;
      title: string;
    };
  };
  created_at: string;
  creator_id: string;
  project_id: string;
  updated_at: string;
  external_id: string;
  project_name: string;
  schema_version: number;
  qr_code: any;
}

export interface ResourceResponse {
  data: {
    tag_id: string;
    tag_name: string;
    tag_type: string;
    tag_attributes: any;
    tag_created_at: string;
    tag_updated_at: string;
    tag_deleted_at: string | null;
    tag_parent_id: string | null;
    tag_team_id: string | null;
    tag_is_shared: boolean;
    tag_schema_version: number;
    tag_is_system: boolean;
    resources: Resource[];
  }[];
}
