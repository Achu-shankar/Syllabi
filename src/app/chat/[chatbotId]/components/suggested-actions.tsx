'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useEbookContext } from '../lib/context/ebook-context';
import { useChatConfig } from '../../contexts/ChatbotContext';

interface SuggestedActionsProps {
  chatId: string;
  chatbotSlug: string;
  append: UseChatHelpers['append'];
}

function PureSuggestedActions({ chatId, chatbotSlug, append }: SuggestedActionsProps) {
  const { isEbookPanelOpen } = useEbookContext();
  const { chatbot } = useChatConfig();

  // Use chatbot's suggested questions if available, otherwise fallback to defaults
  const defaultSuggestedActions = [
    {
      title: '📊 Visualize ML Workflow',
      label: 'with a Mermaid diagram',
      action: 'Explain the typical workflow of a machine learning project from data collection to deployment, then generate a Mermaid flowchart diagram to visualize these steps clearly.',
    },
    {
      title: '🧠 Diagram a Neural Network',
      label: 'using Mermaid',
      action: 'Describe the basic components of a simple feedforward neural network (input layer, hidden layer(s), output layer, neurons, connections), then generate a Mermaid diagram to visualize its structure. Use different node shapes or styles for layers vs. neurons if possible.',
    },
    {title: '📊 Generate a PCA report',
      label: 'in R with visualizations',
      action: 'Generate R code that performs Principal Component Analysis on a sample dataset (e.g., iris) and creates a report with visualizations of the principal components and explained variance.',
    },
    {
      title: '🌳 Build a decision tree',
      label: 'in R for classification',
      action: 'Generate R code to build and visualize a decision tree classifier using the iris dataset. Show the tree structure and evaluate its accuracy.',
    },
    {
      title: '🔍 Explain SVMs with Iris',
      label: 'using R & visualize',
      action: 'Explain Support Vector Machines, then generate R code to train an SVM classifier on the Iris dataset and visualize the decision boundary if possible in a 2D projection.',
    },
    {
      title: '📈 Visualize K-Means',
      label: 'clustering in Python',
      action: 'Generate Python code to perform K-Means clustering on a sample 2D dataset and create a scatter plot visualizing the data points and cluster centroids using scikit-learn and matplotlib.',
    },
  ];

  // Convert chatbot suggested questions to actions format, or use defaults
  const suggestedActions = chatbot?.suggested_questions?.length 
    ? chatbot.suggested_questions.map((question, index) => ({
        title: `💬 ${question.slice(0, 50)}${question.length > 50 ? '...' : ''}`,
        label: '',
        action: question,
      }))
    : defaultSuggestedActions;

  // Determine grid and item visibility based on panel state
  let gridLayoutClasses = "grid sm:grid-cols-2 gap-2 w-full"; // Default when panel is closed
  let shouldShowMoreItems: (index: number) => 'block' | 'hidden sm:block' | 'hidden xl:block' | 'hidden' = 
    (index: number) => index > 1 ? 'hidden sm:block' : 'block'; // Default for panel closed

  if (isEbookPanelOpen) {
    // Panel is open: More restrictive layout - always single column, only two items
    gridLayoutClasses = "grid grid-cols-1 gap-2 w-full"; 
    shouldShowMoreItems = (index: number) => index > 1 ? 'hidden' : 'block'; 
  }

  return (
    <div
      data-testid="suggested-actions"
      className={gridLayoutClasses}
    >
      {suggestedActions.map((suggestedAction, index) => {
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.05 * index }}
            key={`suggested-action-${suggestedAction.title}-${index}`}
            className={shouldShowMoreItems(index)}
          >
            <Button
              variant="ghost"
              onClick={async () => {
                window.history.replaceState({}, '', `/chat/${chatbotSlug}/${chatId}`);

                append({
                  role: 'user',
                  content: suggestedAction.action,
                });
              }}
              className="text-left items-center rounded-xl px-4 py-3.5 text-md flex-1 gap-1 sm:flex-col w-full h-auto justify-start"
              style={{
                backgroundColor: 'var(--chat-suggested-question-chip-background-color, #f3f4f6)',
                color: 'var(--chat-suggested-question-chip-text-color, #374151)',
                borderColor: 'var(--chat-suggested-question-chip-border-color, #d1d5db)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            >
              <span className="font-light text-center">{suggestedAction.title} {suggestedAction.label}</span>
            </Button>
          </motion.div>
        );
      })}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
