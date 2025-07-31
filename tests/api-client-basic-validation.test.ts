import { describe, it, expect, vi } from 'vitest'
import { makeRequest } from '../scripts/marsRobotAPIClientMode.mjs'
import sampleInput from '../samples/sample-input.json'
import sample_input_bad_terrain from '../samples/sample_input_bad_terrain.json'
import sample_input_bad_command from '../samples/sample_input_bad_command.json'
import sample_input_bad_battery from '../samples/sample_input_bad_battery.json'
import { readFileSync } from 'fs';
import { join } from 'path';


describe('makeRequest', () => {
  it('should call API and return data', async () => {
    const data = sampleInput 
    const res = await makeRequest('localhost', 3000, '/api/simulate', data, false)
    expect(res).toHaveProperty('statusCode')
    expect(res).toHaveProperty('data')
  })

  it('should  return command failure for invalid terrain', async() => {
    const badInput = sample_input_bad_terrain
    
    const res = await makeRequest('localhost', 3000, '/api/simulate', badInput, false)
    expect(res.statusCode).toBe(400)
    expect(res.data).toHaveProperty('error')
    expect(res.data.error).toMatch(/terrain/i)
  })

  it('should  return command failure for invalid command', async() => {
    const badInput = sample_input_bad_command
    
    const res = await makeRequest('localhost', 3000, '/api/simulate', badInput, false)
    expect(res.statusCode).toBe(400)
    expect(res.data).toHaveProperty('error')
    expect(res.data.error).toMatch(/command/i)
  })

  it('should  return battery failure for invalid battery supplied', async() => {
    const badInput = sample_input_bad_battery
    
    const res = await makeRequest('localhost', 3000, '/api/simulate', badInput, false)
    expect(res.statusCode).toBe(400)
    expect(res.data).toHaveProperty('error')
    expect(res.data.error).toMatch(/battery/i)
  })

  it('should call API with malformed data and return invalid JSON', async () => {

    const data = readFileSync(join(__dirname, '../samples/sample-input-bad.txt'), 'utf8');
    const res = await makeRequest('localhost', 3000, '/api/simulate', data, false)
    console.log("error response: " + res.data.error)
    expect(res.data.error).toMatch(/invalid/i)
  })
  
})