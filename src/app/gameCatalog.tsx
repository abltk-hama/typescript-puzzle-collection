import type { ComponentType, ReactNode } from "react";
import { GameFlow, type GameProps, type SetupProps } from "./GameFlow";
import { loadBundledPuzzles as loadLights } from "../games/lights-out/data/puzzles";
import type { LightsOutPuzzle } from "../games/lights-out/domain/lightsOut";
import { LightsOutGame } from "../games/lights-out/ui/LightsOutGame";
import { LightsOutSetup } from "../games/lights-out/ui/LightsOutSetup";
import { loadBundledPuzzles as loadFifteen } from "../games/fifteen/data/puzzles";
import type { FifteenPuzzle } from "../games/fifteen/domain/fifteen";
import { FifteenGame } from "../games/fifteen/ui/FifteenGame";
import { FifteenSetup } from "../games/fifteen/ui/FifteenSetup";
import { loadBundledPuzzles as loadMastermind } from "../games/mastermind/data/puzzles";
import type { MastermindPuzzle } from "../games/mastermind/domain/mastermind";
import { MastermindGame } from "../games/mastermind/ui/MastermindGame";
import { MastermindSetup } from "../games/mastermind/ui/MastermindSetup";
import { loadBundledPuzzles as loadMaze } from "../games/maze/data/puzzles";
import type { MazePuzzle } from "../games/maze/domain/maze";
import { MazeGame } from "../games/maze/ui/MazeGame";
import { MazeSetup } from "../games/maze/ui/MazeSetup";
import { loadBundledPuzzles as loadSudoku } from "../games/sudoku/data/puzzles";
import type { SudokuPuzzle } from "../games/sudoku/domain/sudoku";
import { SudokuGame } from "../games/sudoku/ui/SudokuGame";
import { SudokuSetup } from "../games/sudoku/ui/SudokuSetup";
import { loadBundledPuzzles as loadNonogram } from "../games/nonogram/data/puzzles";
import type { NonogramPuzzle } from "../games/nonogram/domain/nonogram";
import { NonogramGame } from "../games/nonogram/ui/NonogramGame";
import { NonogramSetup } from "../games/nonogram/ui/NonogramSetup";
import { loadBundledPuzzles as loadSkyscraper } from "../games/skyscraper/data/puzzles";
import type { SkyscraperPuzzle } from "../games/skyscraper/domain/skyscraper";
import { SkyscraperGame } from "../games/skyscraper/ui/SkyscraperGame";
import { SkyscraperSetup } from "../games/skyscraper/ui/SkyscraperSetup";
import { loadBundledPuzzles as loadKakuro } from "../games/kakuro/data/puzzles";
import type { KakuroPuzzle } from "../games/kakuro/domain/kakuro";
import { KakuroGame } from "../games/kakuro/ui/KakuroGame";
import { KakuroSetup } from "../games/kakuro/ui/KakuroSetup";
import { loadBundledPuzzles as loadFormulaSigns } from "../games/formula-signs/data/puzzles";
import type { FormulaPuzzle } from "../games/formula-signs/domain/formulaSigns";
import { FormulaGame } from "../games/formula-signs/ui/FormulaGame";
import { FormulaSetup } from "../games/formula-signs/ui/FormulaSetup";
import { loadBundledPuzzles as loadSlitherlink } from "../games/slitherlink/data/puzzles";
import type { SlitherlinkPuzzle } from "../games/slitherlink/domain/slitherlink";
import { SlitherlinkGame } from "../games/slitherlink/ui/SlitherlinkGame";
import { SlitherlinkSetup } from "../games/slitherlink/ui/SlitherlinkSetup";

export type GameId =
  | "lights_out"
  | "fifteen"
  | "mastermind"
  | "maze"
  | "sudoku"
  | "nonogram"
  | "skyscraper"
  | "kakuro"
  | "formula_signs"
  | "slitherlink";
export interface GameRegistration {
  id: GameId;
  displayName: string;
  description: string;
  icon: string;
  cardClass?: string;
  render: (onLauncher: () => void) => ReactNode;
}
function register<P>(definition: {
  id: GameId;
  displayName: string;
  description: string;
  icon: string;
  cardClass?: string;
  loadPuzzles: () => Promise<P[]>;
  Setup: ComponentType<SetupProps<P>>;
  Game: ComponentType<GameProps<P>>;
}): GameRegistration {
  return {
    id: definition.id,
    displayName: definition.displayName,
    description: definition.description,
    icon: definition.icon,
    cardClass: definition.cardClass,
    render: (onLauncher) => (
      <GameFlow
        loadPuzzles={definition.loadPuzzles}
        Setup={definition.Setup}
        Game={definition.Game}
        onLauncher={onLauncher}
      />
    ),
  };
}
export const gameCatalog: readonly GameRegistration[] = [
  register<LightsOutPuzzle>({
    id: "lights_out",
    displayName: "ライツアウト",
    description: "光るマスをすべて消そう",
    icon: "✦",
    loadPuzzles: loadLights,
    Setup: LightsOutSetup,
    Game: LightsOutGame,
  }),
  register<FifteenPuzzle>({
    id: "fifteen",
    displayName: "15パズル",
    description: "駒を順番に並べよう",
    icon: "15",
    cardClass: "fifteen-card",
    loadPuzzles: loadFifteen,
    Setup: FifteenSetup,
    Game: FifteenGame,
  }),
  register<MastermindPuzzle>({
    id: "mastermind",
    displayName: "マスターマインド",
    description: "色と位置を推理しよう",
    icon: "●",
    cardClass: "mastermind-card",
    loadPuzzles: loadMastermind,
    Setup: MastermindSetup,
    Game: MastermindGame,
  }),
  register<MazePuzzle>({
    id: "maze",
    displayName: "迷路",
    description: "道を探してゴールへ進もう",
    icon: "⌁",
    cardClass: "maze-card",
    loadPuzzles: loadMaze,
    Setup: MazeSetup,
    Game: MazeGame,
  }),
  register<SudokuPuzzle>({
    id: "sudoku",
    displayName: "数独",
    description: "1〜9を重複なく配置しよう",
    icon: "9",
    cardClass: "sudoku-card",
    loadPuzzles: loadSudoku,
    Setup: SudokuSetup,
    Game: SudokuGame,
  }),
  register<NonogramPuzzle>({
    id: "nonogram",
    displayName: "ノノグラム",
    description: "数字から絵を描き出そう",
    icon: "▦",
    cardClass: "nonogram-card",
    loadPuzzles: loadNonogram,
    Setup: NonogramSetup,
    Game: NonogramGame,
  }),
  register<SkyscraperPuzzle>({
    id: "skyscraper",
    displayName: "スカイスクレーパー",
    description: "見える建物の数から高さを推理しよう",
    icon: "▥",
    cardClass: "skyscraper-card",
    loadPuzzles: loadSkyscraper,
    Setup: SkyscraperSetup,
    Game: SkyscraperGame,
  }),
  register<KakuroPuzzle>({
    id: "kakuro",
    displayName: "カックロ",
    description: "交差する合計から数字を推理しよう",
    icon: "＋",
    cardClass: "kakuro-card",
    loadPuzzles: loadKakuro,
    Setup: KakuroSetup,
    Game: KakuroGame,
  }),
  register<FormulaPuzzle>({
    id: "formula_signs",
    displayName: "数式符号パズル",
    description: "数字の間へ演算記号を入れよう",
    icon: "×",
    cardClass: "formula-card",
    loadPuzzles: loadFormulaSigns,
    Setup: FormulaSetup,
    Game: FormulaGame,
  }),
  register<SlitherlinkPuzzle>({
    id: "slitherlink",
    displayName: "スリザーリンク",
    description: "数字を手がかりに一本のループを作ろう",
    icon: "◯",
    cardClass: "slither-card",
    loadPuzzles: loadSlitherlink,
    Setup: SlitherlinkSetup,
    Game: SlitherlinkGame,
  }),
];
export function findGame(id: GameId | null) {
  return gameCatalog.find((game) => game.id === id);
}
