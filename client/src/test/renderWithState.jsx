import React from 'react';
import { render } from '@testing-library/react';
import { initialState } from '../hooks/useAssessment.js';

export function renderWithState(
  ui,
  { assessmentState = initialState, dispatch = () => {}, ...renderOptions } = {},
) {
  const props = { assessmentState, dispatch };

  function Wrapper({ children }) {
    return React.cloneElement(children, props);
  }

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    assessmentState,
    dispatch,
  };
}

export function renderPlain(ui, options) {
  return render(ui, options);
}
