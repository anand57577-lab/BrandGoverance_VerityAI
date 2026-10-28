
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    const body = await response.text();
    let message = body || `HTTP ${response.status}`;

    try {
      const parsed: unknown = JSON.parse(body);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "detail" in parsed
      ) {
        const detail = parsed.detail;
        message =
          typeof detail === "string"
            ? detail
            : JSON.stringify(detail) ?? String(detail);
      }
    } catch {
      // Keep the response body when the server returns non-JSON error text.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface OrganizationPayload {
  legal_name: string;
  primary_brand_name: string;
  industry: string;
  country_market: string;
  description: string | null;
}

export interface OrganizationResponse extends OrganizationPayload {
  id: number;
  brand_id: number;
}

export interface GuidelinePayload {
  voice_and_tone: string;
  preferred_terminology: string | null;
  restricted_phrases: string | null;
  visual_identity_notes: string | null;
}

export interface ProductPayload {
  name: string;
  sku: string;
  category: string | null;
  specifications: string | null;
  approved_claims: string[];
}

export interface GuidelineResponse extends GuidelinePayload {
  id: number;
  brand_id: number;
  version: number;
  approval_status: string;
  created_at: string;
}

export interface ProductClaimResponse {
  id: number;
  product_id: number;
  claim_text: string;
  approval_status: string;
  source_document_id: number | null;
  effective_date: string | null;
  review_date: string | null;
}

export interface ProductResponse
  extends Omit<ProductPayload, "approved_claims"> {
  id: number;
  brand_id: number;
  created_at: string;
  claims: ProductClaimResponse[];
}

export interface DocumentResponse {
  id: number;
  brand_id: number;
  product_id: number | null;
  filename: string;
  content_type: string;
  document_type: string;
  file_size: number;
  approval_status: string;
  uploaded_at: string;
}

export async function createOrganization(
  payload: OrganizationPayload,
): Promise<OrganizationResponse> {
  return request<OrganizationResponse>("/api/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getOrganization(
  id: number,
): Promise<OrganizationResponse> {
  return request<OrganizationResponse>(`/api/organizations/${id}`);
}

export async function saveGuidelines(
  brandId: number,
  payload: GuidelinePayload,
): Promise<GuidelineResponse> {
  return request<GuidelineResponse>(`/api/brands/${brandId}/guidelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function createProduct(
  brandId: number,
  payload: ProductPayload,
): Promise<ProductResponse> {
  return request<ProductResponse>(`/api/brands/${brandId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listProducts(
  brandId: number,
): Promise<ProductResponse[]> {
  return request<ProductResponse[]>(`/api/brands/${brandId}/products`);
}

export async function uploadDocument(
  brandId: number,
  file: File,
  documentType = "supporting",
  productId?: number,
): Promise<DocumentResponse> {
  const data = new FormData();
  data.append("file", file);
  data.append("document_type", documentType);

  if (productId !== undefined) {
    data.append("product_id", String(productId));
  }

  return request<DocumentResponse>(`/api/brands/${brandId}/documents`, {
    method: "POST",
    body: data,
  });
}

export async function listDocuments(
  brandId: number,
): Promise<DocumentResponse[]> {
  return request<DocumentResponse[]>(`/api/brands/${brandId}/documents`);
}


export async function getGuidelines(brandId: number) {
  return request<any>(`/api/brands/${brandId}/guidelines`);
}


export interface GovernanceFinding {
  claim_text: string;
  status: string;
  severity: string;
  explanation: string;
  source: string | null;
  suggested_correction: string | null;
}

export interface GovernanceResponse {
  product_id: number;
  product_name: string;
  overall_status: string;
  risk_level: string;
  summary: string;
  findings: GovernanceFinding[];
  limitations: string[];
}

export async function analyzeAdvertisement(
  productId: number,
  advertisementText: string,
): Promise<GovernanceResponse> {
  return request<GovernanceResponse>("/api/governance/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: productId,
      advertisement_text: advertisementText,
    }),
  });
}
