/// <reference lib="webworker" />
import { generateSudoku } from './generate'
import type { SudokuWorkerRequest,SudokuWorkerResponse } from './protocol'
const scope=self as DedicatedWorkerGlobalScope
scope.onmessage=(event:MessageEvent<SudokuWorkerRequest>)=>{const request=event.data;try{const puzzle=generateSudoku(request.seed,request.profile,progress=>scope.postMessage({type:'progress',requestId:request.requestId,progress} satisfies SudokuWorkerResponse));scope.postMessage({type:'complete',requestId:request.requestId,puzzle} satisfies SudokuWorkerResponse)}catch(error){scope.postMessage({type:'error',requestId:request.requestId,message:error instanceof Error?error.message:'生成に失敗しました。'} satisfies SudokuWorkerResponse)}}
