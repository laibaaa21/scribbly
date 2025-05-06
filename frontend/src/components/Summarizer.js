import React, { useState } from 'react';
import './Summarizer.css';

const Summarizer = () => {
  const [text, setText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [compressionLevel, setCompressionLevel] = useState(0.5);
  const [summaryMethod, setSummaryMethod] = useState('abstractive'); // 'extractive' or 'abstractive'

  // Improved client-side algorithm to summarize text
  const summarizeText = (text, compressionRatio = 0.5, method = 'abstractive') => {
    // Validate input
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Basic text cleaning
    const cleanText = text
      .replace(/(\r\n|\n|\r)/gm, ' ') // Replace line breaks with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
      .trim();

    // Split text into sentences
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
    
    if (sentences.length <= 3) {
      // If text is already short enough, still try to rephrase or extract key info
      if (sentences.length === 0) return "Text contains no complete sentences.";
      if (sentences.length === 1) return paraphraseSentence(sentences[0].trim());
      
      // For 2-3 sentences, combine the main points
      if (method === 'abstractive') {
        return generateAbstractiveSummary(sentences, 1);
      } else {
        // Simple extractive for very short texts
        return sentences[0].trim() + " " + sentences[sentences.length-1].trim();
      }
    }

    // Choose summarization method
    if (method === 'abstractive') {
      return generateAbstractiveSummary(sentences, compressionRatio);
    } else {
      return generateExtractiveSummary(sentences, compressionRatio);
    }
  };

  // Extractive summarization - select the most important sentences
  const generateExtractiveSummary = (sentences, compressionRatio) => {
    // Score sentences based on several factors
    const sentenceScores = sentences.map((sentence, index) => {
      // 1. Position score - sentences at the beginning and end are often more important
      const positionScore = 
        index < sentences.length * 0.2 || index > sentences.length * 0.8
          ? 2.0  // Increase weight for position
          : 1.0;
      
      // 2. Length score - prefer medium-length sentences
      const words = sentence.split(' ').filter(w => w.length > 0);
      const lengthScore = 
        words.length > 5 && words.length < 30 
          ? 1.5 
          : words.length >= 30 
            ? 0.7 
            : 0.5;
      
      // 3. Word importance score - look for important signal words
      const importantWords = [
        'important', 'significant', 'crucial', 'essential', 'key', 
        'major', 'primary', 'critical', 'fundamental', 'main',
        'therefore', 'thus', 'consequently', 'hence', 'in conclusion',
        'summary', 'ultimately', 'finally', 'result', 'conclude',
        'discover', 'find', 'show', 'demonstrate', 'prove',
        'analyze', 'suggest', 'indicate', 'highlight', 'emphasize',
        'first', 'second', 'third', 'notably', 'specifically'
      ];
      
      const lowerSentence = sentence.toLowerCase();
      
      // Count important words rather than just checking for existence
      const importantWordCount = importantWords.filter(word => 
        lowerSentence.includes(word)
      ).length;
      
      const wordScore = 1.0 + (importantWordCount * 0.3); // Scale up based on how many important words
      
      // 4. Information density score - favor sentences with numbers, proper nouns, or specific data
      const hasNumbers = /\d+/.test(sentence);
      const hasProperNouns = /[A-Z][a-z]+/.test(sentence);
      const dataScore = (hasNumbers || hasProperNouns) ? 1.5 : 1.0;
      
      return {
        text: sentence.trim(),
        score: positionScore * lengthScore * wordScore * dataScore,
        index
      };
    });
    
    // Sort sentences by score (highest first)
    const sortedSentences = [...sentenceScores].sort((a, b) => b.score - a.score);
    
    // Calculate how many sentences to keep based on compression ratio
    const sentencesToKeep = Math.max(1, Math.floor(sentences.length * compressionRatio));
    
    // Select the highest scoring sentences
    const selectedSentences = sortedSentences
      .slice(0, sentencesToKeep)
      // Sort back by original position
      .sort((a, b) => a.index - b.index)
      .map(s => s.text);
    
    // Join sentences back into a coherent summary
    return selectedSentences.join(' ');
  };

  // Abstractive summarization - attempt to generate new sentences that capture the essence
  const generateAbstractiveSummary = (sentences, compressionRatio) => {
    // First, identify the most important sentences using extractive approach
    const extractiveSummary = generateExtractiveSummary(sentences, Math.min(0.5, compressionRatio * 1.5));
    const extractedSentences = extractiveSummary.match(/[^.!?]+[.!?]+/g) || [];
    
    // Extract key topics/themes from the text
    const topics = identifyKeyTopics(sentences.join(' '));
    
    // Identify the main subjects, actions, and objects from extracted sentences
    const elements = extractElements(extractedSentences);
    
    // Generate new sentences based on identified elements
    const generatedSentences = generateSentencesFromElements(elements, topics, compressionRatio);
    
    // Combine some extracted sentences with newly generated ones for coherence
    const numExtractedToKeep = Math.floor(extractedSentences.length * 0.3); // Keep 30% of extracted sentences
    const keptExtracted = extractedSentences
      .slice(0, numExtractedToKeep)
      .map(s => s.trim());
    
    // Combine, avoiding duplicates
    let combinedSentences = [...keptExtracted];
    generatedSentences.forEach(sentence => {
      // Check if this sentence is too similar to any already included
      const isDuplicate = combinedSentences.some(existing => 
        calculateSimilarity(existing, sentence) > 0.7
      );
      if (!isDuplicate) {
        combinedSentences.push(sentence);
      }
    });
    
    // Limit to desired compression ratio
    const targetSentenceCount = Math.max(1, Math.ceil(sentences.length * compressionRatio * 0.8));
    combinedSentences = combinedSentences.slice(0, targetSentenceCount);
    
    // If we ended up with just one sentence, make sure it's comprehensive
    if (combinedSentences.length === 1) {
      return enhanceSentence(combinedSentences[0], topics);
    }
    
    return combinedSentences.join(' ');
  };

  // Identify key topics/themes in the text
  const identifyKeyTopics = (text) => {
    // Remove common words and get word frequencies
    const commonWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'for', 'with', 'on', 'by', 'that', 'this', 'it', 'as', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'];
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.includes(word));
    
    // Count frequencies
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Return top topics
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  };

  // Extract subjects, verbs, etc. from sentences to recreate new ones
  const extractElements = (sentences) => {
    const elements = {
      subjects: new Set(),
      verbs: new Set(),
      objects: new Set(),
      descriptions: new Set()
    };
    
    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().split(' ');
      
      // Very basic NLP - in a real app you'd use a proper NLP library
      // This is just a simplified approach for demonstration
      
      // Assume first noun is subject (simplified)
      const subjectCandidate = words.find(word => 
        !['the', 'a', 'an', 'and', 'or', 'but'].includes(word) && 
        word.length > 2
      );
      if (subjectCandidate) elements.subjects.add(subjectCandidate);
      
      // Look for verbs (simplified - looking for -ing, -ed, etc.)
      const verbCandidates = words.filter(word => 
        word.endsWith('ing') || 
        word.endsWith('ed') || 
        ['is', 'are', 'was', 'were', 'will', 'would', 'could', 'should', 'can', 'may', 'might'].includes(word)
      );
      verbCandidates.forEach(v => elements.verbs.add(v));
      
      // Look for descriptive phrases
      if (sentence.includes('which') || sentence.includes('that') || sentence.includes('where')) {
        const parts = sentence.split(/which|that|where/);
        if (parts.length > 1) {
          elements.descriptions.add(parts[1].trim());
        }
      }
    });
    
    return elements;
  };

  // Generate new sentences from extracted elements
  const generateSentencesFromElements = (elements, topics, compressionRatio) => {
    const sentences = [];
    
    // Simple templates for sentence generation
    const templates = [
      "The text discusses #TOPIC, focusing on #TOPIC2.",
      "A key point about #TOPIC is #DESCRIPTION.",
      "The document primarily addresses #TOPIC and its relationship to #TOPIC2.",
      "An important aspect highlighted is #DESCRIPTION regarding #TOPIC.",
      "The main theme revolves around #TOPIC.",
      "In summary, #TOPIC is examined in relation to #TOPIC2.",
      "The text explores various aspects of #TOPIC.",
      "The document concludes that #DESCRIPTION."
    ];
    
    // Number of sentences to generate
    const targetCount = Math.max(1, Math.min(4, Math.floor(topics.length * compressionRatio * 2)));
    
    // Create sentences from templates
    for (let i = 0; i < targetCount && i < templates.length; i++) {
      let template = templates[i];
      
      // Replace placeholders with actual content
      template = template.replace('#TOPIC', topics[0] || 'the subject');
      template = template.replace('#TOPIC2', topics[1] || topics[0] || 'related concepts');
      
      // Replace description with something meaningful
      if (template.includes('#DESCRIPTION')) {
        const descriptions = Array.from(elements.descriptions);
        if (descriptions.length > 0) {
          const randomIndex = Math.floor(Math.random() * descriptions.length);
          template = template.replace('#DESCRIPTION', descriptions[randomIndex]);
        } else {
          template = template.replace('#DESCRIPTION', `aspects related to ${topics[0]}`);
        }
      }
      
      sentences.push(template);
    }
    
    return sentences;
  };

  // Enhance a single sentence with more topics for a comprehensive summary
  const enhanceSentence = (sentence, topics) => {
    if (topics.length <= 1) return sentence;
    
    // Create a more comprehensive single sentence
    return `The text primarily discusses ${topics[0]}, along with related concepts such as ${topics.slice(1).join(', ')}.`;
  };

  // Calculate similarity between two sentences (simplified)
  const calculateSimilarity = (sentence1, sentence2) => {
    const words1 = new Set(sentence1.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const words2 = new Set(sentence2.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    
    let commonWords = 0;
    words1.forEach(word => {
      if (words2.has(word)) commonWords++;
    });
    
    const similarity = (2 * commonWords) / (words1.size + words2.size);
    return similarity || 0;
  };

  // Simple sentence paraphrasing
  const paraphraseSentence = (sentence) => {
    // Simple templates for paraphrasing
    const templates = [
      "In summary, #SENTENCE",
      "The text states that #SENTENCE",
      "It is noted that #SENTENCE",
      "According to the text, #SENTENCE",
      "The document indicates that #SENTENCE"
    ];
    
    // Use a template if the sentence is a simple statement
    if (sentence.length < 100 && !sentence.includes(',')) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      return template.replace('#SENTENCE', sentence.toLowerCase()).replace(/\.$/, '') + '.';
    }
    
    return sentence;
  };

  const handleSummarize = () => {
    if (!text.trim()) {
      setError('Please enter some text to summarize.');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    // Simulate API delay for better UX (optional)
    setTimeout(() => {
      try {
        // Generate summary using selected method
        const result = summarizeText(text, compressionLevel, summaryMethod);
        
        // Double-check it's actually different from the input
        if (result === text.trim()) {
          // If identical, force a smaller compression ratio and try again
          const forcedResult = summarizeText(text, 0.3, summaryMethod);
          setSummary(forcedResult || "The text is too short to produce a meaningful summary.");
        } else {
          setSummary(result);
        }
      } catch (err) {
        console.error('Summarization error:', err);
        setError('Failed to summarize text. Please try again with different content.');
      } finally {
        setIsLoading(false);
      }
    }, 700); // Slightly longer delay to simulate "thinking"
  };

  const handleCopy = () => {
    if (!summary) return;
    
    navigator.clipboard.writeText(summary)
      .then(() => {
        // Show temporary "Copied!" message (could use a toast or other UI element)
        const copyBtn = document.getElementById('copy-summary-btn');
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
      });
  };

  return (
    <div className="summarizer-container">
      <h2>Text Summarizer</h2>
      
      {error && <div className="summarizer-error">{error}</div>}
      
      <div className="summarizer-input-container">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to summarize..."
          className="summarizer-textarea"
          rows={8}
        />
        
        <div className="summarizer-controls">
          <div className="compression-control">
            <label htmlFor="compression-range">
              Summary Length: {Math.round(compressionLevel * 100)}%
            </label>
            <input
              id="compression-range"
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={compressionLevel}
              onChange={(e) => setCompressionLevel(parseFloat(e.target.value))}
              className="summarizer-range"
            />
          </div>
          
          <div className="method-control">
            <label className="method-label">Summarization Method:</label>
            <div className="method-options">
              <label className="method-option">
                <input
                  type="radio"
                  name="summaryMethod"
                  value="extractive"
                  checked={summaryMethod === 'extractive'}
                  onChange={() => setSummaryMethod('extractive')}
                />
                <span>Extractive</span>
                <small>(selects key sentences)</small>
              </label>
              
              <label className="method-option">
                <input
                  type="radio"
                  name="summaryMethod"
                  value="abstractive"
                  checked={summaryMethod === 'abstractive'}
                  onChange={() => setSummaryMethod('abstractive')}
                />
                <span>Abstractive</span>
                <small>(generates new text)</small>
              </label>
            </div>
          </div>
          
          <button 
            onClick={handleSummarize}
            disabled={isLoading || !text.trim()}
            className="summarizer-button primary"
          >
            {isLoading ? 'Summarizing...' : 'Summarize'}
          </button>
        </div>
      </div>
      
      {summary && (
        <div className="summary-result">
          <div className="summary-header">
            <h3>Summary</h3>
            <button 
              id="copy-summary-btn"
              onClick={handleCopy}
              className="summarizer-button secondary"
            >
              Copy
            </button>
          </div>
          <div className="summary-content">
            {summary}
          </div>
        </div>
      )}
      
      <style jsx>{`
        .method-control {
          margin-top: 15px;
          width: 100%;
        }
        
        .method-label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #555;
        }
        
        .method-options {
          display: flex;
          gap: 15px;
        }
        
        .method-option {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
        }
        
        .method-option input {
          margin: 0;
        }
        
        .method-option span {
          font-weight: 500;
        }
        
        .method-option small {
          color: #777;
          margin-left: 4px;
        }
      `}</style>
    </div>
  );
};

export default Summarizer;
