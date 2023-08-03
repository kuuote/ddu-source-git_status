import { ActionData } from "../@ddu-kinds/git_status.ts";
import { FilterArguments } from "https://deno.land/x/ddu_vim@v3.4.5/base/filter.ts";
import {
  BaseFilter,
  DduItem,
  Item,
  ItemHighlight,
} from "https://deno.land/x/ddu_vim@v3.4.5/types.ts";

const defaultParams = {
  highlightAdded: "diffAdded",
  highlightRemoved: "diffRemoved",
};

const NAME_ADDED = "ddu-source-git_status:added";
const NAME_REMOVED = "ddu-source-git_status:removed";

type Params = typeof defaultParams;

export class Filter extends BaseFilter<Params> {
  filter(args: FilterArguments<Params>): Promise<DduItem[]> {
    const { highlightAdded, highlightRemoved } = args.filterParams;
    const highlightEnabled = highlightAdded !== "" || highlightRemoved !== "";
    const items = args.items as Item<ActionData>[];
    const newItems = items.map((item) => {
      const status = String(item.action?.status);
      const display = item.display ?? item.word;
      const newItem = {
        ...item,
        display: status + display,
      };
      if (newItem.highlights != null) {
        newItem.highlights = newItem.highlights.map((hl) => ({
          ...hl,
          col: hl.col + status.length,
        }));
      } else {
        newItem.highlights = [];
      }
      if (highlightEnabled) {
        const highlights: ItemHighlight[] = [];
        if (status === "?? " || status.includes("U")) {
          highlights.push({
            name: NAME_REMOVED,
            hl_group: highlightRemoved,
            col: 1,
            width: 2,
          });
        } else {
          if (status[0] !== " ") {
            highlights.push({
              name: NAME_ADDED,
              hl_group: highlightAdded,
              col: 1,
              width: 1,
            });
          }
          if (status[1] !== " ") {
            highlights.push({
              name: NAME_REMOVED,
              hl_group: highlightRemoved,
              col: 2,
              width: 1,
            });
          }
        }
        newItem.highlights.push(
          ...highlights.filter((hl) => hl.hl_group !== ""),
        );
      }
      return newItem;
    });
    return Promise.resolve(newItems as DduItem[]);
  }

  params(): Params {
    return defaultParams;
  }
}
