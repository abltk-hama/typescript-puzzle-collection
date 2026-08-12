import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,expect,it,vi } from 'vitest'
import { deleteDB } from 'idb'
import { MastermindGame } from '../ui/MastermindGame'
import type { MastermindPuzzle } from '../domain/mastermind'
const puzzle:MastermindPuzzle={id:'ui-mastermind',title:'UI問題',difficulty:'easy',codeLength:4,symbolCount:6,allowDuplicates:false,maxAttempts:10,secret:[1,2,3,4],metadata:{}}
beforeEach(async()=>deleteDB('puzzle-collection'))
it('enters and submits a winning guess',async()=>{const user=userEvent.setup();render(<MastermindGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);await waitFor(()=>expect(screen.getByLabelText('入力位置 1')).toBeInTheDocument());for(const value of [1,2,3,4])await user.click(screen.getByRole('button',{name:`数字 ${value}`}));await user.click(screen.getByRole('button',{name:'この予想を判定'}));expect(screen.getByText(/正解です/)).toBeInTheDocument()})
