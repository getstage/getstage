import downloadHtml from "virtual:stage-landing-download-html";
import { extractLandingDocument } from "./extractLandingDocument";
import { useStageLanding } from "./useStageLanding";

const landing = extractLandingDocument(downloadHtml);

export function StageDownloadPage() {
  useStageLanding({
    title: landing.title,
    description: landing.description,
    bodyClass: landing.bodyClass,
    autoDownload: true,
  });

  return <div dangerouslySetInnerHTML={{ __html: landing.innerHtml }} />;
}
