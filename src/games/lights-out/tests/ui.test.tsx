import { render,screen,waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect,it,vi } from "vitest";
import { LightsOutGame } from "../ui/LightsOutGame";
import type { LightsOutPuzzle } from "../domain/lightsOut";
import { deleteLightsSession } from "../data/sessions";

const puzzle:LightsOutPuzzle={id:"lights-ui-preview",title:"UI問題",difficulty:"easy",width:5,height:5,initialState:[true,true,false,false,false,true,false,false,false,false,...Array(15).fill(false)],oneSolutionMoves:[{row:0,column:0}],metadata:{}};

it("previews and applies a move to completion",async()=>{localStorage.clear();await deleteLightsSession(puzzle.id);const user=userEvent.setup();render(<LightsOutGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);const cell=screen.getByRole("button",{name:/1行1列/});await waitFor(()=>expect(cell).toBeEnabled());await user.click(cell);expect(screen.getByText(/1手先をプレビュー/)).toBeInTheDocument();expect(screen.getByText(/点灯: 3 → 0/)).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"実際に適用"}));expect(await screen.findByText(/完成しました/)).toBeInTheDocument();expect(screen.getByText(/実効手数: 1/)).toBeInTheDocument();expect(screen.getByText(/試行: 1回/)).toBeInTheDocument()});

it("supports chained preview, undo, and clear without changing the real board",async()=>{localStorage.clear();await deleteLightsSession(puzzle.id);const user=userEvent.setup();render(<LightsOutGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);await waitFor(()=>expect(screen.getByRole("button",{name:/1行1列/})).toBeEnabled());await user.click(screen.getByRole("button",{name:"補助設定を開く"}));await user.selectOptions(screen.getByLabelText(/プレビューホライゾン/),"2");await user.click(screen.getByRole("button",{name:/1行1列/}));await user.click(screen.getByRole("button",{name:/1行2列/}));expect(screen.getByText(/2手目を連鎖/)).toBeInTheDocument();expect(screen.getByText(/試行: 2回/)).toBeInTheDocument();await user.click(screen.getByRole("button",{name:"プレビューを1手戻す"}));await user.click(screen.getByRole("button",{name:"クリア"}));expect(screen.queryByRole("button",{name:"実際に適用"})).not.toBeInTheDocument();expect(screen.getByText(/実効手数: 0/)).toBeInTheDocument()});
