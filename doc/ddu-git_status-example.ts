import * as stdpath from "jsr:@std/path@^1.0.0";
import type { ConfigArguments } from "jsr:@shougo/ddu-vim@^5.0.0/config";
import {
  type ActionArguments,
  ActionFlags,
  BaseConfig,
} from "jsr:@shougo/ddu-vim@^5.0.0/types";
import * as u from "jsr:@core/unknownutil@^4.0.0";
import type { ActionData as GitStatusActionData } from "jsr:@kuuote/ddu-kind-git-status@^1.0.0";

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
