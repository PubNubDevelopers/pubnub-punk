import { RefObject, useEffect } from 'react';

interface ScrollState {
  autoScroll: boolean;
  showScrollButton: boolean;
}

interface ScrollActions {
  setAutoScroll: (value: boolean) => void;
  setShowScrollButton: (value: boolean) => void;
}

export const scrollToBottom = (
  containerRef: RefObject<HTMLDivElement>,
  scrollActions: ScrollActions
): void => {
  if (containerRef.current) {
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
    scrollActions.setAutoScroll(true);
    scrollActions.setShowScrollButton(false);
  }
};

export const handleScroll = (
  containerRef: RefObject<HTMLDivElement>,
  scrollActions: ScrollActions
): void => {
  if (containerRef.current) {
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 5;
    
    if (isAtBottom) {
      scrollActions.setAutoScroll(true);
      scrollActions.setShowScrollButton(false);
    } else {
      scrollActions.setAutoScroll(false);
      scrollActions.setShowScrollButton(true);
    }
  }
};

export const useAutoScroll = (
  containerRef: RefObject<HTMLDivElement>,
  autoScroll: boolean,
  dependencies: any[]
): void => {
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [...dependencies, autoScroll]);
};

export const useDelayedAutoScroll = (
  containerRef: RefObject<HTMLDivElement>,
  autoScroll: boolean,
  condition: boolean,
  dependencies: any[]
): void => {
  useEffect(() => {
    if (autoScroll && containerRef.current && condition) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [...dependencies, autoScroll, condition]);
};