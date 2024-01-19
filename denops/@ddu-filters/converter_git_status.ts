import { ActionData } from "../@ddu-kinds/git_status.ts";
import { FilterArguments } from "https://deno.land/x/ddu_vim@v3.10.0/base/filter.ts";
import {
  BaseFilter,
  DduItem,
  Item,
} from "https://deno.land/x/ddu_vim@v3.10.0/types.ts";

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
    for (const item of items) {
      const status = String(item.action?.status);
      // add status if omitted
      if (!item.display?.startsWith(status)) {
        item.display = status + item.display;
        if (item.highlights != null) {
          item.highlights = item.highlights.map((hl) => ({
            ...hl,
            col: hl.col + status.length,
          }));
        }
      }
      if (highlightEnabled) {
        item.highlights ??= [];
        if (status === "?? " || status.includes("U")) {
          item.highlights.push({
            name: NAME_REMOVED,
            hl_group: highlightRemoved,
            col: 1,
            width: 2,
          });
        } else {
          if (status[0] !== " ") {
            item.highlights.push({
              name: NAME_ADDED,
              hl_group: highlightAdded,
              col: 1,
              width: 1,
            });
          }
          if (status[1] !== " ") {
            item.highlights.push({
              name: NAME_REMOVED,
              hl_group: highlightRemoved,
              col: 2,
              width: 1,
            });
          }
        }
      }
    }
    return Promise.resolve(items as DduItem[]);
  }

  params(): Params {
    return defaultParams;
  }
}
