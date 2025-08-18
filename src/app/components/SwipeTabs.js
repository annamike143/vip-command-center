import React, { useState } from 'react';
import { useSwipeable } from 'react-swipeable';
import './SwipeTabs.css';

const SwipeTabs = ({ tabs, children }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const handlers = useSwipeable({
    onSwipedLeft: () => setActiveIndex(i => Math.min(i + 1, tabs.length - 1)),
    onSwipedRight: () => setActiveIndex(i => Math.max(i - 1, 0)),
    trackMouse: true,
  });

  return (
    <div className="swipe-tabs-container" {...handlers}>
      <div className="swipe-tabs-header">
        {tabs.map((tab, idx) => (
          <button
            key={tab}
            className={idx === activeIndex ? 'active' : ''}
            onClick={() => setActiveIndex(idx)}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="swipe-tabs-content">
        {children[activeIndex]}
      </div>
    </div>
  );
};

export default SwipeTabs;
