import type { ComponentType,ReactNode } from 'react'
import { GameFlow,type GameProps,type SetupProps } from './GameFlow'
import { loadBundledPuzzles as loadLights } from '../games/lights-out/data/puzzles'
import type { LightsOutPuzzle } from '../games/lights-out/domain/lightsOut'
import { LightsOutGame } from '../games/lights-out/ui/LightsOutGame'
import { LightsOutSetup } from '../games/lights-out/ui/LightsOutSetup'
import { loadBundledPuzzles as loadFifteen } from '../games/fifteen/data/puzzles'
import type { FifteenPuzzle } from '../games/fifteen/domain/fifteen'
import { FifteenGame } from '../games/fifteen/ui/FifteenGame'
import { FifteenSetup } from '../games/fifteen/ui/FifteenSetup'
import { loadBundledPuzzles as loadMastermind } from '../games/mastermind/data/puzzles'
import type { MastermindPuzzle } from '../games/mastermind/domain/mastermind'
import { MastermindGame } from '../games/mastermind/ui/MastermindGame'
import { MastermindSetup } from '../games/mastermind/ui/MastermindSetup'

export type GameId='lights_out'|'fifteen'|'mastermind'
export interface GameRegistration{id:GameId;displayName:string;description:string;icon:string;cardClass?:string;render:(onLauncher:()=>void)=>ReactNode}
function register<P>(definition:{id:GameId;displayName:string;description:string;icon:string;cardClass?:string;loadPuzzles:()=>Promise<P[]>;Setup:ComponentType<SetupProps<P>>;Game:ComponentType<GameProps<P>>}):GameRegistration{return{id:definition.id,displayName:definition.displayName,description:definition.description,icon:definition.icon,cardClass:definition.cardClass,render:onLauncher=><GameFlow loadPuzzles={definition.loadPuzzles} Setup={definition.Setup} Game={definition.Game} onLauncher={onLauncher}/>}}
export const gameCatalog:readonly GameRegistration[]=[register<LightsOutPuzzle>({id:'lights_out',displayName:'ライツアウト',description:'光るマスをすべて消そう',icon:'✦',loadPuzzles:loadLights,Setup:LightsOutSetup,Game:LightsOutGame}),register<FifteenPuzzle>({id:'fifteen',displayName:'15パズル',description:'駒を順番に並べよう',icon:'15',cardClass:'fifteen-card',loadPuzzles:loadFifteen,Setup:FifteenSetup,Game:FifteenGame}),register<MastermindPuzzle>({id:'mastermind',displayName:'マスターマインド',description:'色と位置を推理しよう',icon:'●',cardClass:'mastermind-card',loadPuzzles:loadMastermind,Setup:MastermindSetup,Game:MastermindGame})]
export function findGame(id:GameId|null){return gameCatalog.find(game=>game.id===id)}
