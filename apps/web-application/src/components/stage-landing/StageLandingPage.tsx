import homeHtml from "virtual:stage-landing-home-html";
import { extractLandingDocument } from "./extractLandingDocument";
import { useStageLanding } from "./useStageLanding";

const landing = extractLandingDocument(homeHtml);

export function StageLandingPage() {
  useStageLanding({
    title: landing.title,
    description: landing.description,
    experience: true,
  });

  return <div dangerouslySetInnerHTML={{ __html: landing.innerHtml }} />;
}
