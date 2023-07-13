import { ConfigArguments } from "https://deno.land/x/ddu_vim@v3.4.1/base/config.ts";
import {
  ActionArguments,
  ActionFlags,
  BaseConfig,
} from "https://deno.land/x/ddu_vim@v3.4.1/types.ts";

type Never = Record<never, never>;

export type GitStatusActionData = {
  status: string;
  path: string;
  worktree: string;
};

export class Config extends BaseConfig {
  override config(args: ConfigArguments): Promise<void> {
    args.contextBuilder.patchGlobal({
      sourceOptions: {
        git_status: {
          converters: ["converter_git_status"],
          // or if you like directory highlight like fzf-preview,
          // you can use converter_hl_dir
          // https://github.com/kyoh86/ddu-filter-converter_hl_dir
          //
          // converters: [
          //   "converter_hl_dir",
          //   "converter_git_status",
          // ],
        },
      },
      kindOptions: {
        git_status: {
          actions: {
            // fire GinPatch command to selected items
            // using https://github.com/lambdalisue/gin.vim
            patch: async (args: ActionArguments<Never>) => {
              for (const item of args.items) {
                const action = item.action as GitStatusActionData;
                await args.denops.cmd("tabnew");
                await args.denops.cmd("tcd " + action.worktree);
                await args.denops.cmd("GinPatch ++no-head " + action.path);
              }
              return ActionFlags.None;
            },
          },
          defaultAction: "open",
        },
      },
    });
    return Promise.resolve();
  }
}
