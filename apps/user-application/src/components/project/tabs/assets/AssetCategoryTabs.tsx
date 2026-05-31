import type { AssetCategory, AssetView } from "@/types/project/assetsTab";
import { AssetMenuIcon } from "./assetsIcons";

export function AssetCategoryTabs({
  categories,
  activeView,
  onChange,
}: {
  categories: AssetCategory[];
  activeView: AssetView;
  onChange: (view: AssetView) => void;
}) {
  return (
    <div className="flex w-fit flex-wrap items-start gap-1 rounded-[8px] bg-white p-[2px] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]">
      {categories.map((category) => {
        const isActive = category.id === activeView;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onChange(category.id)}
            className={`inline-flex h-[32px] cursor-pointer items-center gap-2 rounded-[6px] px-3 text-[13px] font-medium leading-[1.25] transition-colors ${
              isActive
                ? "bg-[#E5E5E5] text-[#171717] shadow-[0_0.45px_0.5px_rgba(10,10,10,0.25)]"
                : "text-[#737373] hover:bg-[#F5F5F5]"
            }`}
          >
            <AssetMenuIcon src={category.iconSrc} />
            <span>{category.label}</span>
            <span className={isActive ? "opacity-50" : ""}>({category.count})</span>
          </button>
        );
      })}
    </div>
  );
}
