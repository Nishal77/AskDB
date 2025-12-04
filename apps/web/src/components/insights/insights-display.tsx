'use client';

interface InsightsDisplayProps {
  insights: string;
}

export function InsightsDisplay({ insights }: InsightsDisplayProps) {
  // Clean up the insights text - remove markdown symbols
  const cleanInsights = insights
    .replace(/\*\*/g, '') // Remove **
    .replace(/\*/g, '') // Remove *
    .replace(/#{1,6}\s/g, '') // Remove # headers
    .replace(/###\s/g, '') // Remove ###
    .replace(/##\s/g, '') // Remove ##
    .replace(/#\s/g, '') // Remove #
    .trim();

  // Split into sections by headers (lines ending with colon)
  const lines = cleanInsights.split('\n').filter(line => line.trim());
  
  const formatContent = () => {
    const elements: JSX.Element[] = [];
    let currentSection: string[] = [];
    let currentSectionTitle = '';
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Check if it's a section header (ends with colon and is not indented)
      if (trimmed.endsWith(':') && !trimmed.startsWith(' ') && trimmed.length < 50) {
        // Save previous section
        if (currentSection.length > 0) {
          elements.push(
            <div key={`section-${elements.length}`} className="mb-8 last:mb-0">
              <h3 className="text-base font-bold text-gray-900 tracking-tight mb-4 pb-3 border-b border-gray-300">
                {currentSectionTitle}
              </h3>
              <div className="space-y-4">
                {currentSection.map((item, idx) => {
                  // Check if item starts with a number or bullet pattern
                  const isNumbered = /^\d+\.\s/.test(item);
                  const isBoldKey = /^[A-Z][^:]+:/.test(item);
                  
                  if (isBoldKey) {
                    const [key, ...valueParts] = item.split(':');
                    const value = valueParts.join(':').trim();
                    return (
                      <div key={idx} className="leading-relaxed">
                        <span className="font-bold text-gray-900">{key.trim()}:</span>
                        {value && <span className="text-gray-800 ml-2 font-medium">{value}</span>}
                      </div>
                    );
                  }
                  
                  return (
                    <p key={idx} className="text-gray-800 leading-relaxed text-[15px] font-medium">
                      {item}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        }
        
        // Start new section
        currentSectionTitle = trimmed.replace(':', '').trim();
        currentSection = [];
      } else if (trimmed) {
        // Add to current section
        currentSection.push(trimmed);
      }
    });
    
    // Add last section
    if (currentSection.length > 0) {
      elements.push(
        <div key={`section-${elements.length}`} className="mb-8 last:mb-0">
          <h3 className="text-base font-bold text-gray-900 tracking-tight mb-4 pb-3 border-b border-gray-300">
            {currentSectionTitle || 'Insights'}
          </h3>
          <div className="space-y-4">
            {currentSection.map((item, idx) => {
              const isBoldKey = /^[A-Z][^:]+:/.test(item);
              
              if (isBoldKey) {
                const [key, ...valueParts] = item.split(':');
                const value = valueParts.join(':').trim();
                return (
                  <div key={idx} className="leading-relaxed">
                    <span className="font-bold text-gray-900">{key.trim()}:</span>
                    {value && <span className="text-gray-800 ml-2 font-medium">{value}</span>}
                  </div>
                );
              }
              
              return (
                <p key={idx} className="text-gray-800 leading-relaxed text-[15px] font-medium">
                  {item}
                </p>
              );
            })}
          </div>
        </div>
      );
    }
    
    // If no sections found, display as plain text
    if (elements.length === 0) {
      return (
        <div className="space-y-4">
          {lines.map((line, idx) => (
            <p key={idx} className="text-gray-800 leading-relaxed text-[15px] font-medium">
              {line.trim()}
            </p>
          ))}
        </div>
      );
    }
    
    return elements;
  };

  return (
    <div className="space-y-4">
      {/* Premium header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-bold text-gray-900 tracking-tight">
          AI Insights
        </h3>
      </div>

      {/* Premium content with borders only - no background */}
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        {/* Content area with premium spacing */}
        <div className="px-6 py-6">
          {formatContent()}
        </div>
      </div>
    </div>
  );
}

