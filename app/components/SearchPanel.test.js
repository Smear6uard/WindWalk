import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput, Text, TouchableOpacity } from 'react-native';
import SearchPanel from './SearchPanel';
import { geocodeAddress } from '../utils/geocode';

const mockSetOrigin = jest.fn();
const mockSetDestination = jest.fn();
const mockFetchRoutes = jest.fn();

jest.mock('../context/RouteContext', () => ({
  useRoute: () => ({
    setOrigin: mockSetOrigin,
    setDestination: mockSetDestination,
    fetchRoutes: mockFetchRoutes,
    loading: false,
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

  it('calls fetchRoutes when Find pedway route button is pressed', async () => {
    geocodeAddress.mockResolvedValue([]);

    let root;
    await act(async () => {
      root = renderer.create(<SearchPanel />);
    });

    const buttons = root.root.findAllByType(TouchableOpacity);

    const findRouteButton = buttons.find((button) =>
      button
        .findAllByType(Text)
        .some((t) => t.props.children === 'Find pedway route')
    );

    expect(findRouteButton).toBeTruthy();

    await act(async () => {
      findRouteButton.props.onPress();
    });

    expect(mockFetchRoutes).toHaveBeenCalledTimes(1);
  });
});

