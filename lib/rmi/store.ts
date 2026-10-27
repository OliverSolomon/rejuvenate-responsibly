import * as file from "./store-file";
import * as supabase from "./store-supabase";
import { storageBackend } from "./storage-config";

/**
 * The one door to storage. Everything in the app imports from here, and this
 * file picks the backend per call: Supabase when its service role key is
 * configured, the local JSON file otherwise (see storage-config.ts).
 *
 * The two backends expose identical function names and signatures, so a route
 * never knows which one it is talking to.
 */

export * from "./store-types";
export { storageBackend } from "./storage-config";
export type { StorageStatus, ImportResult } from "./store-supabase";
export type { LegacyData } from "./store-file";

const impl = () => (storageBackend() === "supabase" ? supabase : file);

/* assessments */

export const createAssessment: typeof file.createAssessment = (...a) =>
  impl().createAssessment(...a);
export const getAssessment: typeof file.getAssessment = (...a) => impl().getAssessment(...a);
export const updateAssessment: typeof file.updateAssessment = (...a) =>
  impl().updateAssessment(...a);
export const clearAnswers: typeof file.clearAnswers = (...a) => impl().clearAnswers(...a);
export const setPayment: typeof file.setPayment = (...a) => impl().setPayment(...a);
export const findByMerchantReference: typeof file.findByMerchantReference = (...a) =>
  impl().findByMerchantReference(...a);

/* reports */

export const setReport: typeof file.setReport = (...a) => impl().setReport(...a);
export const editReport: typeof file.editReport = (...a) => impl().editReport(...a);
export const markReportSent: typeof file.markReportSent = (...a) => impl().markReportSent(...a);
export const setReportPdf: typeof file.setReportPdf = (...a) => impl().setReportPdf(...a);

/* companies */

export const listCompanies: typeof file.listCompanies = () => impl().listCompanies();
export const companyById: typeof file.companyById = (...a) => impl().companyById(...a);
export const companyBySlug: typeof file.companyBySlug = (...a) => impl().companyBySlug(...a);
export const createCompany: typeof file.createCompany = (...a) => impl().createCompany(...a);
export const updateCompany: typeof file.updateCompany = (...a) => impl().updateCompany(...a);

/* the report template and the organisation's own logo */

export const readTemplate: typeof file.readTemplate = (...a) => impl().readTemplate(...a);
export const saveTemplateDraft: typeof file.saveTemplateDraft = (...a) =>
  impl().saveTemplateDraft(...a);
export const publishTemplate: typeof file.publishTemplate = (...a) =>
  impl().publishTemplate(...a);
export const discardTemplateDraft: typeof file.discardTemplateDraft = (...a) =>
  impl().discardTemplateDraft(...a);
export const setClientLogo: typeof file.setClientLogo = (...a) => impl().setClientLogo(...a);

/* sharing */

export const addShares: typeof file.addShares = (...a) => impl().addShares(...a);
export const recordDeliveries: typeof file.recordDeliveries = (...a) =>
  impl().recordDeliveries(...a);
export const markSharesNotified: typeof file.markSharesNotified = (...a) =>
  impl().markSharesNotified(...a);
export const findShare: typeof file.findShare = (...a) => impl().findShare(...a);
export const saveStakeholderResponse: typeof file.saveStakeholderResponse = (...a) =>
  impl().saveStakeholderResponse(...a);

/* lists */

export const listAssessments: typeof file.listAssessments = () => impl().listAssessments();
export const listAllStakeholderResponses: typeof file.listAllStakeholderResponses = () =>
  impl().listAllStakeholderResponses();
export const listStakeholderResponses: typeof file.listStakeholderResponses = (...a) =>
  impl().listStakeholderResponses(...a);

/* settings and samples */

export const readSettings: typeof file.readSettings = (...a) => impl().readSettings(...a);
export const changeSettings: typeof file.changeSettings = (...a) => impl().changeSettings(...a);
export const replaceSamples: typeof file.replaceSamples = (...a) => impl().replaceSamples(...a);
export const removeSamples: typeof file.removeSamples = () => impl().removeSamples();
export const countSamples: typeof file.countSamples = () => impl().countSamples();

/* moving from the file to Supabase */

/** What the old JSON file holds, for the import panel. Reads only. */
export async function legacySummary(): Promise<{
  path: string;
  assessments: number;
  responses: number;
  hasSettings: boolean;
}> {
  const data = await file.readLegacy();
  return {
    path: file.LEGACY_FILE,
    assessments: data.assessments.filter((a) => !a.sample).length,
    responses: data.stakeholderResponses.filter((r) => !r.sample).length,
    hasSettings: Object.keys(data.settings ?? {}).length > 0,
  };
}

export async function storageStatus() {
  if (storageBackend() !== "supabase") return null;
  return supabase.storageStatus();
}

export async function importLegacy() {
  if (storageBackend() !== "supabase") {
    throw new Error("Supabase storage is not active, so there is nothing to import into.");
  }
  return supabase.importLegacy(await file.readLegacy());
}
