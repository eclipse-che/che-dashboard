/*
 * Copyright (c) 2018-2025 Red Hat, Inc.
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { EventsTimeline } from '@/components/EventsTimeline';
import { SandboxEvent } from '@/services/types';

function event(overrides: Partial<SandboxEvent> = {}): SandboxEvent {
  return {
    uid: 'event-1',
    type: 'Normal',
    reason: 'Scheduled',
    message: 'Successfully assigned hello-world to node worker-1.',
    count: 1,
    lastTimestamp: '2025-06-01T10:00:00Z',
    reportingComponent: 'default-scheduler',
    ...overrides,
  };
}

describe('EventsTimeline', () => {
  it('says there is nothing to show, and why', () => {
    render(<EventsTimeline events={[]} />);

    expect(screen.getByTestId('no-events')).toHaveTextContent('No events to show.');
    expect(screen.getByTestId('no-events')).toHaveTextContent('retention window');
    expect(screen.queryByTestId('events-timeline')).not.toBeInTheDocument();
  });

  it('does not blame retention when the listing is what failed', () => {
    render(<EventsTimeline events={[]} hasFailed />);

    expect(screen.getByTestId('no-events')).toHaveTextContent('could not be listed');
    expect(screen.getByTestId('no-events')).not.toHaveTextContent('retention window');
  });

  it('hides an event the cluster reported without a message', () => {
    render(<EventsTimeline events={[event({ message: '' })]} />);

    expect(screen.getByTestId('no-events')).toBeInTheDocument();
  });

  it('is a live region, so a new event is announced', () => {
    render(<EventsTimeline events={[event()]} />);

    expect(screen.getByRole('log', { name: 'Sandbox events' })).toBeInTheDocument();
  });

  it('puts the most recent event at the top', () => {
    render(
      <EventsTimeline
        events={[
          event({ uid: 'a', reason: 'Scheduled', lastTimestamp: '2025-06-01T10:00:00Z' }),
          event({ uid: 'b', reason: 'Pulled', lastTimestamp: '2025-06-01T11:00:00Z' }),
        ]}
      />,
    );

    expect(screen.getAllByTestId('event-reason').map(element => element.textContent)).toEqual([
      'Pulled',
      'Scheduled',
    ]);
  });

  it('counts the events it is showing', () => {
    render(<EventsTimeline events={[event({ uid: 'a' }), event({ uid: 'b' })]} />);

    expect(screen.getByTestId('events-timeline')).toHaveTextContent('Showing 2 events');
  });

  it('counts a single event in the singular', () => {
    render(<EventsTimeline events={[event()]} />);

    expect(screen.getByTestId('events-timeline')).toHaveTextContent('Showing 1 event');
  });

  describe('an event card', () => {
    it('names the reason, the reporter and the message', () => {
      render(<EventsTimeline events={[event()]} />);

      const row = screen.getByTestId('event-row');
      expect(screen.getByTestId('event-reason')).toHaveTextContent('Scheduled');
      expect(row).toHaveTextContent('Generated from default-scheduler');
      expect(row).toHaveTextContent('Successfully assigned hello-world to node worker-1.');
      expect(screen.getByTestId('event-time')).toHaveTextContent(
        new Date('2025-06-01T10:00:00Z').toLocaleTimeString(),
      );
    });

    it('marks a warning so it reads differently from the rest', () => {
      render(<EventsTimeline events={[event({ type: 'Warning', reason: 'FailedMount' })]} />);

      // identity-obj-proxy maps a CSS module key to its own name.
      const icon = screen.getByTitle('FailedMount');
      expect(icon).toHaveClass('warning');
    });

    it('does not mark a normal event as a warning', () => {
      render(<EventsTimeline events={[event()]} />);

      expect(screen.getByTitle('Scheduled')).not.toHaveClass('warning');
    });

    it('says how often a repeated event fired', () => {
      render(<EventsTimeline events={[event({ count: 7 })]} />);

      expect(screen.getByTestId('event-count')).toHaveTextContent('7 times, last at');
    });

    it('keeps a single occurrence uncounted', () => {
      render(<EventsTimeline events={[event({ count: undefined })]} />);

      expect(screen.queryByTestId('event-count')).not.toBeInTheDocument();
    });

    it('falls back to the first occurrence when there is no last one', () => {
      render(
        <EventsTimeline
          events={[event({ lastTimestamp: undefined, firstTimestamp: '2025-06-01T09:00:00Z' })]}
        />,
      );

      expect(screen.getByTestId('event-time')).toHaveTextContent(
        new Date('2025-06-01T09:00:00Z').toLocaleTimeString(),
      );
    });

    it('stands in for an event the cluster reported without a reason', () => {
      render(<EventsTimeline events={[event({ reason: undefined })]} />);

      expect(screen.getByTestId('event-reason')).toHaveTextContent('Event');
    });

    it('leaves out the reporter the cluster did not name', () => {
      render(<EventsTimeline events={[event({ reportingComponent: undefined })]} />);

      expect(screen.getByTestId('event-row')).not.toHaveTextContent('Generated from');
    });
  });
});
