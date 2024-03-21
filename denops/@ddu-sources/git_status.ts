import { ActionData } from "../@ddu-kinds/git_status.ts";
import { dirname } from "https://deno.land/std@0.220.1/path/mod.ts";
import {
  BaseSource,
  GatherArguments,
  OnInitArguments,
} from "https://deno.land/x/ddu_vim@v3.10.3/base/source.ts";
import { Item } from "https://deno.land/x/ddu_vim@v3.10.3/types.ts";

const defaultParams = {
  omitStatusColumn: false,
};

type Params = typeof defaultParams;

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

export class Source extends BaseSource<Params> {
  override kind = "git_status";

  private worktree = "";

  override async onInit({
    denops,
    sourceOptions,
  }: OnInitArguments<Params>): Promise<void> {
    const worktree = String(sourceOptions.path);
    const type = await Deno.stat(worktree)
      .then((info) => info.isFile ? "file" : "dir")
      .catch(() => "nil");
    let dir: string;
    switch (type) {
      case "file":
        dir = dirname(worktree);
        break;
      case "dir":
        dir = worktree;
        break;
      default:
        dir = String(await denops.call("getcwd"));
    }
    this.worktree = await new Deno.Command("git", {
      args: ["rev-parse", "--show-toplevel"],
      cwd: dir,
    }).output()
      .then(({ stdout }) =>
        new TextDecoder().decode(stdout)
          .trim()
      );
  }

  override gather(
    args: GatherArguments<Params>,
  ): ReadableStream<Array<Item<ActionData>>> {
    return new ReadableStream({
      start: async (controller) => {
        const status = await run([
          "git",
          "-C",
          this.worktree,
          "status",
          "-uall",
          "--porcelain=v1",
          "-z",
        ])
          .then((output) => {
            const lines = output.split("\0");
            const filteredLines: string[] = [];
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].length !== 0) {
                filteredLines.push(lines[i]);
                if (lines[i].startsWith("R")) {
                  i++;
                }
              }
            }
            return filteredLines;
          });
        controller.enqueue(status.map((line) => {
          const pathLine = line.slice(3);
          return {
            word: pathLine,
            display: args.sourceParams.omitStatusColumn ? pathLine : line,
            action: {
              path: pathLine.replace(/.*-> /, ""), // trim rename mark
              worktree: this.worktree,
              status: line.slice(0, 3),
            },
          };
        }));
        controller.close();
      },
    });
  }

  override params(): Params {
    return defaultParams;
  }
}
