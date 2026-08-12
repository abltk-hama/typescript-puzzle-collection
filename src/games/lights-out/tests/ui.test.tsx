import { render,screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect,it,vi } from 'vitest'
import { LightsOutGame } from '../ui/LightsOutGame'
import type { LightsOutPuzzle } from '../domain/lightsOut'
const puzzle:LightsOutPuzzle={id:'ui',title:'UI問題',difficulty:'easy',width:5,height:5,initialState:[true,true,false,false,false,true,false,false,false,false,...Array(15).fill(false)],oneSolutionMoves:[{row:0,column:0}],metadata:{}}
it('plays a board to completion',async()=>{const user=userEvent.setup();render(<LightsOutGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);await user.click(screen.getByRole('button',{name:/1行1列/}));expect(await screen.findByText(/すべての光が消えました/)).toBeInTheDocument()})
