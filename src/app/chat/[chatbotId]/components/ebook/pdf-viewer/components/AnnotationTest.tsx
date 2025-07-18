"use client";

import React from 'react';
import { Annotation } from './AnnotationLayer';

// Mock annotation data generator
export const generateMockAnnotations = (numPages: number = 3): Annotation[] => {
  const annotations: Annotation[] = [];

  // Add some highlights on page 1
  annotations.push({
    id: 'highlight-1',
    pageNumber: 1,
    type: 'highlight',
    color: 'rgba(255, 235, 59, 0.6)', // Yellow
    opacity: 0.6,
    rect: {
      x: 100,   // X coordinate in PDF space
      y: 200,   // Y coordinate in PDF space
      width: 200, // Width
      height: 20  // Height
    }
  });

  annotations.push({
    id: 'highlight-2',
    pageNumber: 1,
    type: 'highlight',
    color: 'rgba(76, 175, 80, 0.6)', // Green
    opacity: 0.6,
    rect: {
      x: 50,
      y: 300,
      width: 300,
      height: 25
    }
  });

  // Add a note on page 1
  annotations.push({
    id: 'note-1',
    pageNumber: 1,
    type: 'note',
    content: 'This is an important point to remember!',
    rect: {
      x: 400,
      y: 150,
      width: 30,
      height: 30
    }
  });

  // Add underline on page 2 (if exists)
  if (numPages >= 2) {
    annotations.push({
      id: 'underline-1',
      pageNumber: 2,
      type: 'underline',
      color: '#2196F3', // Blue
      rect: {
        x: 120,
        y: 250,
        width: 180,
        height: 15
      }
    });

    // Add strikethrough on page 2
    annotations.push({
      id: 'strikethrough-1',
      pageNumber: 2,
      type: 'strikethrough',
      color: '#F44336', // Red
      rect: {
        x: 150,
        y: 350,
        width: 220,
        height: 18
      }
    });
  }

  // Add quad points annotation on page 3 (if exists)
  if (numPages >= 3) {
    annotations.push({
      id: 'quad-highlight-1',
      pageNumber: 3,
      type: 'highlight',
      color: 'rgba(156, 39, 176, 0.6)', // Purple
      quadPoints: [
        100, 200,  // Point 1 (x1, y1)
        300, 200,  // Point 2 (x2, y2)
        300, 250,  // Point 3 (x3, y3)
        100, 250   // Point 4 (x4, y4)
      ]
    });
  }

  return annotations;
};

// Test component that can be used to toggle mock annotations
interface AnnotationTestProps {
  onAnnotationsChange: (annotations: Annotation[]) => void;
  currentAnnotations: Annotation[];
}

const AnnotationTest: React.FC<AnnotationTestProps> = ({
  onAnnotationsChange,
  currentAnnotations
}) => {
  const handleGenerateMockAnnotations = () => {
    const mockAnnotations = generateMockAnnotations(5); // Generate for 5 pages
    onAnnotationsChange(mockAnnotations);
    console.log('Generated mock annotations:', mockAnnotations);
  };

  const handleClearAnnotations = () => {
    onAnnotationsChange([]);
    console.log('Cleared all annotations');
  };

  const handleAddRandomAnnotation = () => {
    const types: Annotation['type'][] = ['highlight', 'note', 'underline', 'strikethrough'];
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const newAnnotation: Annotation = {
      id: `random-${Date.now()}`,
      pageNumber: Math.floor(Math.random() * 3) + 1, // Random page 1-3
      type: randomType,
      rect: {
        x: Math.random() * 400 + 50,   // Random x: 50-450
        y: Math.random() * 500 + 100,  // Random y: 100-600
        width: Math.random() * 200 + 100, // Random width: 100-300
        height: Math.random() * 30 + 15   // Random height: 15-45
      }
    };

    if (randomType === 'note') {
      newAnnotation.content = `Random note created at ${new Date().toLocaleTimeString()}`;
    }

    onAnnotationsChange([...currentAnnotations, newAnnotation]);
    console.log('Added random annotation:', newAnnotation);
  };

  return (
    <div className="p-4 border-b border-border bg-muted/50">
      <h3 className="text-sm font-medium mb-3">Annotation Testing</h3>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerateMockAnnotations}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          Generate Mock Annotations
        </button>
        <button
          onClick={handleAddRandomAnnotation}
          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
        >
          Add Random Annotation
        </button>
        <button
          onClick={handleClearAnnotations}
          className="px-3 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90"
        >
          Clear All
        </button>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        Current annotations: {currentAnnotations.length}
      </div>
    </div>
  );
};

export default AnnotationTest; 