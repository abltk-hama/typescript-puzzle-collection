import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,expect,it,vi } from 'vitest'
import { deleteDB } from 'idb'
import { generateMaze } from '../generation/generate'
import { MazeGame } from '../ui/MazeGame'
beforeEach(async()=>deleteDB('puzzle-collection'))
it('shows a hint and moves to its cell',async()=>{const puzzle=generateMaze(9,'easy'),user=userEvent.setup();render(<MazeGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);await waitFor(()=>expect(screen.getByRole('grid',{name:'迷路盤面'})).toBeInTheDocument());await user.click(screen.getByRole('button',{name:'次に進むマスを表示'}));const target=puzzle.answerPath[1];await user.click(screen.getByRole('gridcell',{name:new RegExp(`${target.row+1}行${target.column+1}列`)}));expect(screen.getByText('手数: 1')).toBeInTheDocument()})
