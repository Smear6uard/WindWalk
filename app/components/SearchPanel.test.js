import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput, Text, TouchableOpacity } from 'react-native';
import SearchPanel from './SearchPanel';
import { geocodeAddress } from '../utils/geocode';

const mockSetOrigin = jest.fn();
const mockSetDestination = jest.fn();
const mockFetchRoutes = jest.fn();
const mockSetError = jest.fn();

jest.mock('../context/RouteContext', () => ({
  useRoute: () => ({
    origin: null,
    destination: null,
    setOrigin: mockSetOrigin,
    setDestination: mockSetDestination,
    fetchRoutes: mockFetchRoutes,
    loading: false,
    error: null,
    setError: mockSetError,
  }),
}));

jest.mock('../utils/geocode', () => ({
  geocodeAddress: jest.fn(),
}));

jest.useFakeTimers();

describe('SearchPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls fetchRoutes when Find Warmest Route button is pressed', async () => {
    geocodeAddress.mockResolvedValue([
      {
        id: 'sample',
        label: 'DePaul Center (1 E Jackson Blvd)',
        coordinates: { lat: 41.88, lng: -87.63 },
      },
    ]);

    let root;
    await act(async () => {
      root = renderer.create(<SearchPanel />);
    });

    const inputs = root.root.findAllByType(TextInput);
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      inputs[0].props.onChangeText('DePaul JCDM building');
      inputs[1].props.onChangeText('Millennium Park');
    });

    const buttons = root.root.findAllByType(TouchableOpacity);

    const findRouteButton = buttons.find((button) =>
      button
        .findAllByType(Text)
        .some((t) => t.props.children === 'Find Warmest Route')
    );

    expect(findRouteButton).toBeTruthy();

    await act(async () => {
      findRouteButton.props.onPress();
    });

    expect(mockFetchRoutes).toHaveBeenCalledTimes(1);
    expect(mockFetchRoutes).toHaveBeenCalledWith({
      origin: { lat: 41.88, lng: -87.63 },
      destination: { lat: 41.88, lng: -87.63 },
    });
  });
});

