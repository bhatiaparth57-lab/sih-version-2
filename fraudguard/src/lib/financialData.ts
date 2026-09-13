/**
 * Financial data access.
 *
 * Current Supabase schema (projects, vendors, investigations, profiles) has no
 * invoice / budget-category / line-item tables. Until those exist, this module
 * serves the separated demo dataset and never pretends live rows are present.
 *
 * Production tables required (all amounts in INR):
 *
 * vendors
 *   id uuid pk, name text, pan text, gstin text
 *
 * projects  (already exists — map amount_sanctioned / amount_spent)
 *   id text pk, amount_sanctioned numeric, amount_spent numeric, …
 *
 * approved_budgets
 *   project_id text fk, total_amount numeric
 *
 * budget_categories
 *   id text pk, project_id text fk, name text, allocated_amount numeric
 *
 * invoices
 *   id uuid pk, project_id text, vendor_id uuid, invoice_date date,
 *   invoice_number text, description text, quantity numeric, unit_price numeric,
 *   claimed_amount numeric, tax_amount numeric, total_amount numeric,
 *   supporting_document_url text, supporting_file_ref text,
 *   verification_status text, category_id text
 *
 * invoice_line_items
 *   id uuid pk, invoice_id uuid fk, description text, item_key text,
 *   category_id text, quantity numeric, unit text, unit_price numeric,
 *   claimed_amount numeric
 *
 * reference_prices
 *   item_key text pk, label text, unit text, unit_price numeric
 *
 * Use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY only (anon key, never the
 * service-role secret in frontend code).
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { DEMO_FINANCIAL_DATASET } from '@/lib/financialDemoData';
import type {
  FinancialDataset,
  Invoice,
  InvoiceLineItem,
  InvoiceVerificationStatus,
} from '@/lib/financialTypes';

function asStatus(value: unknown): InvoiceVerificationStatus {
  if (value === 'verified' || value === 'warning' || value === 'failed' || value === 'pending') return value;
  return 'pending';
}

export async function loadFinancialDataset(): Promise<FinancialDataset> {
  if (!isSupabaseConfigured) {
    return { ...DEMO_FINANCIAL_DATASET, source: 'demo' };
  }

  try {
    const { data: invoiceRows, error } = await supabase.from('invoices').select('*');
    if (error || !invoiceRows?.length) {
      return { ...DEMO_FINANCIAL_DATASET, source: 'demo' };
    }

    const { data: lineRows } = await supabase.from('invoice_line_items').select('*');
    const linesByInvoice = new Map<string, InvoiceLineItem[]>();
    for (const row of lineRows ?? []) {
      const invoiceId = String(row.invoice_id);
      const item: InvoiceLineItem = {
        id: String(row.id),
        invoiceId,
        description: String(row.description ?? ''),
        itemKey: row.item_key ?? undefined,
        categoryId: row.category_id ?? undefined,
        quantity: Number(row.quantity),
        unit: String(row.unit ?? ''),
        unitPrice: Number(row.unit_price),
        claimedAmount: Number(row.claimed_amount),
      };
      const list = linesByInvoice.get(invoiceId) ?? [];
      list.push(item);
      linesByInvoice.set(invoiceId, list);
    }

    const invoices: Invoice[] = invoiceRows.map((row) => {
      const id = String(row.id);
      return {
        id,
        projectId: String(row.project_id),
        vendorId: String(row.vendor_id),
        invoiceDate: String(row.invoice_date),
        invoiceNumber: String(row.invoice_number ?? ''),
        description: String(row.description ?? ''),
        quantity: row.quantity == null ? undefined : Number(row.quantity),
        unitPrice: row.unit_price == null ? undefined : Number(row.unit_price),
        claimedAmount: Number(row.claimed_amount ?? 0),
        taxAmount: Number(row.tax_amount ?? 0),
        totalAmount: Number(row.total_amount ?? 0),
        supportingDocumentUrl: row.supporting_document_url ?? undefined,
        supportingFileRef: row.supporting_file_ref ?? undefined,
        verificationStatus: asStatus(row.verification_status),
        categoryId: row.category_id ?? undefined,
        lineItems: linesByInvoice.get(id) ?? [],
      };
    });

    return { ...DEMO_FINANCIAL_DATASET, source: 'supabase', invoices };
  } catch {
    return { ...DEMO_FINANCIAL_DATASET, source: 'demo' };
  }
}
