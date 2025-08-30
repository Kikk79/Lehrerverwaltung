import React, { useEffect, useState } from 'react';
import { AssignmentResult } from '../../../shared/types';

const AssignmentDetails: React.FC = () => {
  const [assignmentResults, setAssignmentResults] = useState<AssignmentResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWeightingPanel, setShowWeightingPanel] = useState(false);
  const [weights, setWeights] = useState({
    equality: 33,
    continuity: 33,
    loyalty: 34
  });

  const loadAssignmentResults = async (customWeights?: typeof weights) => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await window.electronAPI.assignment.generate(customWeights || weights);
      setAssignmentResults(results);
      
    } catch (err) {
      console.error('Failed to generate assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate assignments');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAssignments = () => {
    loadAssignmentResults();
  };

  const handleWeightChange = (type: keyof typeof weights, value: number) => {
    const newWeights = { ...weights, [type]: value };
    
    // Ensure weights sum to 100
    const total = newWeights.equality + newWeights.continuity + newWeights.loyalty;
    if (total !== 100) {
      // Adjust other weights proportionally
      const remaining = 100 - value;
      const otherTypes = Object.keys(newWeights).filter(key => key !== type) as Array<keyof typeof weights>;
      const otherSum = otherTypes.reduce((sum, key) => sum + weights[key], 0);
      
      if (otherSum > 0) {
        otherTypes.forEach(key => {
          newWeights[key] = Math.round((weights[key] / otherSum) * remaining);
        });
        
        // Fix rounding errors
        const newTotal = Object.values(newWeights).reduce((sum, val) => sum + val, 0);
        const diff = 100 - newTotal;
        if (diff !== 0) {
          newWeights[otherTypes[0]] += diff;
        }
      }
    }
    
    setWeights(newWeights);
  };

  const handleGenerateWithWeights = () => {
    loadAssignmentResults(weights);
    setShowWeightingPanel(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const formatScore = (score: number) => {
    return `${Math.round(score * 100)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating optimal assignments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Assignment Results</h2>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowWeightingPanel(!showWeightingPanel)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                Adjust Weights
              </button>
              <button 
                onClick={handleGenerateAssignments}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Generate Assignments
              </button>
            </div>
          </div>
          
          {/* Current Weights Display */}
          <div className="mt-2 text-sm text-gray-600">
            Current weights: Equality {weights.equality}% • Continuity {weights.continuity}% • Loyalty {weights.loyalty}%
          </div>
        </div>

        {/* Weighting Panel */}
        {showWeightingPanel && (
          <div className="px-6 py-4 bg-purple-50 border-b border-purple-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Weighting Controls</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Equality (Gleichmäßigkeit): {weights.equality}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.equality}
                  onChange={(e) => handleWeightChange('equality', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Distribute workload evenly among teachers</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Continuity (Kontinuität): {weights.continuity}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.continuity}
                  onChange={(e) => handleWeightChange('continuity', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Prefer consistent scheduling patterns</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loyalty (Lehrertreue): {weights.loyalty}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={weights.loyalty}
                  onChange={(e) => handleWeightChange('loyalty', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">Keep teachers with their familiar subjects</p>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setShowWeightingPanel(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateWithWeights}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Generate with New Weights
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="px-6 py-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Assignment Results */}
        <div className="p-6">
          {assignmentResults.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <h3 className="mt-2 text-lg font-semibold text-gray-600">No Assignments Generated Yet</h3>
              <p className="mt-1 text-gray-500 mb-4">
                Use the AI-powered assignment system to automatically match teachers to courses.
              </p>
              <button 
                onClick={handleGenerateAssignments}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Generate Assignments Now
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900">Assignment Summary</h4>
                <p className="text-sm text-blue-700">
                  Generated {assignmentResults.length} assignments using AI optimization
                </p>
              </div>
              
              {assignmentResults.map((result, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-blue-600 font-semibold">
                          {result.teacher.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {result.teacher.name} → {result.course.topic}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Teacher ID: {result.teacher.id} • Course ID: {result.course.id}
                        </p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getScoreColor(result.score)}`}>
                      Score: {formatScore(result.score)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700">Lessons</p>
                      <p className="text-sm text-gray-600">{result.course.lessons_count} sessions</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Duration</p>
                      <p className="text-sm text-gray-600">{result.course.lesson_duration} min each</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Period</p>
                      <p className="text-sm text-gray-600">
                        {new Date(result.course.start_date).toLocaleDateString()} - {new Date(result.course.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">Status</p>
                      <p className="text-sm text-gray-600 capitalize">{result.assignment.status}</p>
                    </div>
                  </div>

                  {result.assignment.ai_rationale && (
                    <div className="bg-white rounded border border-gray-200 p-3 mb-3">
                      <h4 className="text-xs font-medium text-gray-700 mb-1">AI Rationale</h4>
                      <p className="text-sm text-gray-600">{result.assignment.ai_rationale}</p>
                    </div>
                  )}

                  {result.conflicts && result.conflicts.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                      <h4 className="text-xs font-medium text-yellow-800 mb-2 flex items-center">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Conflicts Detected
                      </h4>
                      {result.conflicts.map((conflict, conflictIndex) => (
                        <p key={conflictIndex} className="text-xs text-yellow-700">
                          {conflict.description}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetails;