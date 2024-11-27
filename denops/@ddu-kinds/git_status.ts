import { ensure, is, maybe } from "jsr:@core/unknownutil@^4.0.0";
import {
  BaseKind,
  type GetPreviewerArguments,
} from "jsr:@shougo/ddu-vim@^5.0.0/kind";
import {
  type ActionArguments,
  ActionFlags,
  type DduItem,
  type Previewer,
} from "jsr:@shougo/ddu-vim@^5.0.0/types";
import * as path from "jsr:@std/path@^1.0.0";

export type ActionData = {
  status: string; // like "MM "
  path: string; // relative path from worktree
  worktree: string; // path to worktree
};

type Never = Record<never, never>;

const run = async (cmd: string[], cwd?: string): Promise<string> => {
  if (cwd == null) {
    cwd = Deno.cwd();
  }
  const proc = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    cwd,
  });
  const { stdout } = await proc.output();
  return new TextDecoder().decode(stdout);
};

const getWorktree = (item: DduItem): string => {
  return (item.action as ActionData).worktree;
};

const getPathes = (items: DduItem[]): string[] => {
  return items.map((item) => (item.action as ActionData).path);
};

const executeGit = (
  args: string[],
  items: DduItem[],
): Promise<Deno.CommandOutput> => {
  return new Deno.Command("git", {
    args: args.concat(getPathes(items)),
    cwd: getWorktree(items[0]),
  }).output();
};

export class Kind extends BaseKind<Never> {
  override actions: Record<
    string,
    (args: ActionArguments<Never>) => Promise<ActionFlags>
  > = {
    add: async (args) => {
      await executeGit(["add"], args.items);
      return ActionFlags.RefreshItems;
    },
    executeGit: async (args) => {
      const gitArgs = ensure(
        args.actionParams,
        is.ObjectOf({
          args: is.ArrayOf(is.String),
        }),
      ).args;
      await executeGit(gitArgs, args.items);
      return ActionFlags.RefreshItems;
    },
    open: async (args) => {
      const command = maybe(
        args.actionParams,
        is.ObjectOf({
          command: is.String,
        }),
      )?.command ?? "edit";
      const worktree = getWorktree(args.items[0]);
      const pathes = await Promise.all(
        getPathes(args.items)
          .map((p) => args.denops.call("fnameescape", p) as Promise<string>),
      );
      for (const filePath of pathes) {
        await args.denops.cmd(command + " " + path.join(worktree, filePath));
      }
      return ActionFlags.None;
    },
    reset: async (args) => {
      await executeGit(["reset"], args.items);
      return ActionFlags.RefreshItems;
    },
    restore: async (args) => {
      await executeGit(["restore"], args.items);
      return ActionFlags.RefreshItems;
    },
  };

  override async getPreviewer(
    args: GetPreviewerArguments,
  ): Promise<Previewer | undefined> {
    const action = args.item.action as ActionData;
    let diff = "";
    const diffCached = await run([
      "git",
      "--no-pager",
      "diff",
      "--cached",
      action.path,
    ], action.worktree);
    if (diffCached.trim() !== "") {
      diff = diffCached;
    }
    if (diff === "") {
      diff = await run([
        "git",
        "--no-pager",
        "diff",
        action.path,
      ], action.worktree);
    }
    if (diff.trim() !== "") {
      return {
        kind: "nofile",
        contents: diff.split("\n"),
        syntax: "diff",
      };
    }
    try {
      const filePath = path.join(action.worktree, action.path);
      const stat = await Deno.stat(filePath);
      if (!stat.isFile) {
        return;
      }
      return {
        kind: "buffer",
        path: filePath,
      };
    } catch {
      return;
    }
  }

  override params(): Never {
    return {};
  }
}
