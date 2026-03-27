export type InvoiceState = "draft" | "issued" | "paid" | "rectified";
export type ClientType = "individual" | "business";
export type IvaType = "exempt" | "standard";

export interface InvoiceClient {
  name: string;
  nif: string;
  address: string;
  type: ClientType;
}

export interface InvoiceLine {
  description: string;
  amount: number;
}

export interface Invoice {
  id: string;
  number: string;             // YYYY-NNN
  state: InvoiceState;
  issuerName: string;
  issuerNif: string;
  issuerAddress: string;
  client: InvoiceClient;
  line: InvoiceLine;
  issueDate: string;          // ISO date string
  ivaType: IvaType;
  ivaRate: number;            // 0 or 21
  ivaAmount: number;
  irpfRate: number;           // 0, 7, or 15
  irpfAmount: number;
  total: number;
  simplificada: boolean;
  issuedAt?: string;
  paidAt?: string;
  pdfPath?: string;
  rectificaRef?: string;      // id of original invoice (if this is a rectificativa)
  correctionReason?: string;
  createdAt: string;
}
