import { render,screen,waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach,expect,it,vi } from 'vitest'
import { deleteDB } from 'idb'
import { FifteenGame } from '../ui/FifteenGame'
import type { FifteenPuzzle } from '../domain/fifteen'
const puzzle:FifteenPuzzle={id:'ui-fifteen',title:'UI問題',difficulty:'easy',initialTiles:[1,2,3,4,5,6,7,8,9,10,11,12,13,14,0,15],knownSolution:[15],metadata:{}}
beforeEach(async()=>deleteDB('puzzle-collection'))
it('moves a tile and reports completion',async()=>{const user=userEvent.setup();render(<FifteenGame puzzle={puzzle} onBack={vi.fn()} onLauncher={vi.fn()}/>);await waitFor(()=>expect(screen.getByRole('grid',{name:'15パズル盤面'})).toBeInTheDocument());await user.click(screen.getByRole('button',{name:'駒 15'}));expect(screen.getByText(/完成しました/)).toBeInTheDocument()})
