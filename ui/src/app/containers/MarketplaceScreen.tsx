import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getLatestMarketItems } from "../hooks/graphql/queries";
import MarketplaceRow from "../components/marketplace/MarketplaceRow";
import useAdventurerStore from "../hooks/useAdventurerStore";
import LootIconLoader from "../components/icons/Loader";
import useCustomQuery from "../hooks/useCustomQuery";
import { useQueriesStore } from "../hooks/useQueryStore";
import { Item } from "../types";
import { getItemData } from "../lib/utils";

export interface MarketplaceScreenProps {
  upgradeTotalCost: number;
}
/**
 * @container
 * @description Provides the marketplace/purchase screen for the adventurer.
 */

export default function MarketplaceScreen({
  upgradeTotalCost,
}: MarketplaceScreenProps) {
  const adventurer = useAdventurerStore((state) => state.adventurer);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeMenu, setActiveMenu] = useState<number | undefined>();
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const [itemsCount, setItemsCount] = useState(0);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const { data, isLoading } = useQueriesStore();

  const [marketLatestItems, setMarketLatestItems] = useState<Item[]>([]);

  useEffect(() => {
    if (data.latestMarketItemsQuery) {
      setMarketLatestItems(data.latestMarketItemsQuery.items);
    }
  }, [data.latestMarketItemsQuery]);

  const adventurers = data.adventurersInListQuery
    ? data.adventurersInListQuery.adventurers
    : [];

  const headings = ["Item", "Tier", "Slot", "Type", "Cost", "Actions"];

  const headingToKeyMapping: { [key: string]: string } = {
    Item: "item",
    Tier: "tier",
    Slot: "slot",
    Type: "type",
    Cost: "cost",
  };

  const handleSort = (heading: string) => {
    const mappedField = headingToKeyMapping[heading];
    if (!mappedField) return;

    if (sortField === mappedField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(mappedField);
      setSortDirection("asc");
    }
  };

  const sortedMarketLatestItems = useMemo(() => {
    if (!sortField) return marketLatestItems;
    const sortedItems = [...marketLatestItems].sort((a, b) => {
      let aItemData = getItemData(a.item ?? ""); // get item data for a
      let bItemData = getItemData(b.item ?? ""); // get item data for b
      let aValue, bValue;

      if (
        sortField === "tier" ||
        sortField === "type" ||
        sortField === "slot"
      ) {
        aValue = aItemData[sortField];
        bValue = bItemData[sortField];
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

      if (typeof aValue === "string" && !isNaN(Number(aValue))) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }

      if ((aValue ?? "") < (bValue ?? ""))
        return sortDirection === "asc" ? -1 : 1;
      if ((aValue ?? "") > (bValue ?? ""))
        return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return sortedItems;
  }, [marketLatestItems, sortField, sortDirection]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowDown":
          setSelectedIndex((prev) => {
            const newIndex = Math.min(prev + 1, itemsCount - 1);
            return newIndex;
          });
          break;
        case "ArrowUp":
          setSelectedIndex((prev) => {
            const newIndex = Math.max(prev - 1, 0);
            return newIndex;
          });
          break;
        case "Enter":
          setActiveMenu(selectedIndex);
          break;
      }
    },
    [selectedIndex, itemsCount]
  );

  useEffect(() => {
    if (!activeMenu) {
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [activeMenu, handleKeyDown]);

  useEffect(() => {
    if (!activeMenu) {
      const button = rowRefs.current[selectedIndex];
      if (button) {
        button.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }
  }, [selectedIndex, activeMenu]);

  const calculatedNewGold = adventurer?.gold
    ? adventurer?.gold - upgradeTotalCost
    : 0;

  console.log(calculatedNewGold);

  return (
    <>
      {adventurer?.level != 0 ? (
        <div className="w-full">
          <p className="text-center text-lg sm:text-2xl lg:text-4xl ">
            Loot Fountain
          </p>
          <div className="w-full  sm:mx-auto overflow-y-auto sm:border h-[400px] sm:border-terminal-green table-scroll">
            {isLoading.latestMarketItemsQuery && (
              <div className="flex justify-center p-10 text-center">
                <LootIconLoader />
              </div>
            )}
            <table className="w-full sm:border sm:border-terminal-green">
              <thead className="sticky top-0 sm:border z-5 sm:border-terminal-green bg-terminal-black sm:text-xl">
                <tr className="">
                  {headings.map((heading, index) => (
                    <th
                      key={index}
                      className="px-2.5 sm:px-3 cursor-pointer"
                      onClick={() => handleSort(heading)}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="">
                {!isLoading.latestMarketItemsQuery &&
                  sortedMarketLatestItems.map((item: Item, index: number) => (
                    <MarketplaceRow
                      item={item}
                      index={index}
                      selectedIndex={selectedIndex}
                      adventurers={adventurers}
                      isActive={activeMenu == index + 1}
                      setActiveMenu={setActiveMenu}
                      calculatedNewGold={calculatedNewGold}
                      key={index}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex w-full mt-[200px]">
          <p className="mx-auto items-center text-[50px] animate-pulse">
            Adventurer must be level 2 or higher to access Loot Fountain!
          </p>
        </div>
      )}
    </>
  );
}
