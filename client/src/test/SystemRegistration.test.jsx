import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SystemRegistration from '../components/phases/SystemRegistration';
import { initialState } from '../hooks/useAssessment';

function renderRegistration(overrides = {}) {
  const dispatch = vi.fn();
  const assessmentState = { ...initialState, ...overrides };
  render(<SystemRegistration assessmentState={assessmentState} dispatch={dispatch} />);
  return { dispatch };
}

describe('SystemRegistration', () => {
  it('renders the form with 3 sections', () => {
    renderRegistration();
    expect(screen.getByTestId('registration-form')).toBeInTheDocument();
    expect(screen.getByTestId('section-identity')).toBeInTheDocument();
    expect(screen.getByTestId('section-people-data')).toBeInTheDocument();
    expect(screen.getByTestId('section-sector-scale')).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', () => {
    renderRegistration();
    fireEvent.click(screen.getByTestId('registration-submit'));
    expect(screen.getAllByText('This field is required').length).toBeGreaterThan(0);
  });

  it('validates intended purpose minimum length', () => {
    renderRegistration();

    const purposeField = screen.getByPlaceholderText(
      /Describe what the system is designed to do/,
    );
    fireEvent.change(purposeField, { target: { value: 'Too short' } });
    fireEvent.click(screen.getByTestId('registration-submit'));

    expect(
      screen.getByText(/at least 100 characters/),
    ).toBeInTheDocument();
  });

  it('dispatches SET_SYSTEM when form is valid', () => {
    const { dispatch } = renderRegistration();

    fireEvent.change(screen.getByPlaceholderText(/Automated CV Screener/), { target: { value: 'Test System' } });
    fireEvent.change(screen.getByPlaceholderText(/Workday Inc/), { target: { value: 'Test Vendor' } });
    fireEvent.change(screen.getByPlaceholderText(/Workday AI Recruiting/), { target: { value: 'v1.0' } });

    const systemTypeSelect = document.querySelector('select[name="systemType"]');
    fireEvent.change(systemTypeSelect, { target: { value: 'ml_statistical' } });

    const purposeField = screen.getByPlaceholderText(
      /Describe what the system is designed to do/,
    );
    fireEvent.change(purposeField, {
      target: {
        value:
          'This system evaluates credit applications by scoring applicants based on their financial history, income statements, and transactional patterns to support lending decisions.',
      },
    });

    const outputsField = screen.getByPlaceholderText(
      /Scores are reviewed by a recruiter/,
    );
    fireEvent.change(outputsField, { target: { value: 'Scores are reviewed by human analysts before decisions are made.' } });

    const deploymentSelect = document.querySelector('select[name="deploymentContext"]');
    fireEvent.change(deploymentSelect, { target: { value: 'Customer-facing' } });

    const affectedField = screen.getByPlaceholderText(
      /Job applicants to our EU offices/,
    );
    fireEvent.change(affectedField, { target: { value: 'Retail banking customers across the EU' } });

    const controllerSelect = document.querySelector('select[name="inputDataController"]');
    fireEvent.change(controllerSelect, { target: { value: 'Our organisation' } });

    const sectorSelect = document.querySelector('select[name="primarySector"]');
    fireEvent.change(sectorSelect, { target: { value: 'Retail banking/credit' } });

    const businessLineSelect = document.querySelector('select[name="businessLine"]');
    fireEvent.change(businessLineSelect, { target: { value: 'credit_lending' } });

    const yesRadio = screen.getByDisplayValue('yes');
    fireEvent.click(yesRadio);

    fireEvent.click(screen.getByTestId('registration-submit'));

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'SET_SYSTEM' }),
    );
  });
});
