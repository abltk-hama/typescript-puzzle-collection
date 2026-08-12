export type SudokuWorkerRequest={type:'generate';requestId:string;seed:number;profile:'easy'|'medium'|'hard'}
export type SudokuWorkerResponse={type:'progress';requestId:string;progress:number}|{type:'complete';requestId:string;puzzle:import('../domain/sudoku').SudokuPuzzle}|{type:'error';requestId:string;message:string}
