import * as stdpath from "https://deno.land/std@0.220.1/path/mod.ts";
import { ConfigArguments } from "https://deno.land/x/ddu_vim@v3.10.3/base/config.ts";
import {
  ActionArguments,
  ActionFlags,
  BaseConfig,
} from "https://deno.land/x/ddu_vim@v3.10.3/types.ts";
import * as u from "https://deno.land/x/unknownutil@v3.17.0/mod.ts";
import { ActionData as GitStatusActionData } from "https://pax.deno.dev/kuuote/ddu-source-git_status@v1.0.0/denops/@ddu-kinds/git_status.ts";

type Never = Record<never, never>;

export class Config extends BaseConfig {
  override config(args: ConfigArguments): Promise<void> {
    args.contextBuilder.patchGlobal({
      ui: "ff",
      sourceOptions: {
        git_status: {
          // highlight status column
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
            // show diff of file
            // using https://github.com/kuuote/ddu-source-git_diff
            // example:
            //   call ddu#ui#do_action('itemAction', #{name: 'diff'})
            //   call ddu#ui#do_action('itemAction', #{name: 'diff', params: #{cached: v:true}})
            diff: async (args) => {
              const action = args.items[0].action as GitStatusActionData;
              const path = stdpath.join(action.worktree, action.path);
              await args.denops.call("ddu#start", {
                name: "file:git_diff",
                sources: [{
                  name: "git_diff",
                  options: {
                    path,
                  },
                  params: {
                    ...u.maybe(args.actionParams, u.isRecord) ?? {},
                    onlyFile: true,
                  },
                }],
              });
              return ActionFlags.None;
            },
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
