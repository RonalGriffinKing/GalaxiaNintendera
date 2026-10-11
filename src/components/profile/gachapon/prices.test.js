import {it,expect} from 'vitest'
import {validateGachaponPrices} from './prices'
it('accepts cheaper shared integer prices without changing the input',()=>{const value={normal:5,epic:12};expect(validateGachaponPrices(value)).toEqual(value);expect(value).toEqual({normal:5,epic:12})})
it('rejects invalid financial prices',()=>{for(const normal of [0,-1,1.5,Infinity,NaN,'abc',1000001])expect(()=>validateGachaponPrices({normal,epic:50})).toThrow()})
