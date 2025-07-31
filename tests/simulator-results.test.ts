import { describe, it, expect, vi } from 'vitest'
import { makeRequest } from '../scripts/marsRobotAPIClientMode.js'
import sampleInput from '../samples/sample-input.json'
import test_expected_result from '../samples/test_expected_result.json'

describe('makeRequest', () => {
  it('should call API and return expected known data results', async () => {
    const data = sampleInput
    const res = await makeRequest('localhost', 3000, '/api/simulate', data, false)
    expect(res.statusCode).toBe(200)
    expect(res.data).toHaveProperty("VisitedCells")
    expect(res.data).toHaveProperty("SamplesCollected")
    expect(res.data).toHaveProperty("Battery")
    expect(res.data).toHaveProperty("FinalPosition")
    expect(res.data).toEqual(test_expected_result)
  })
})
