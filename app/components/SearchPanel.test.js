import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput, Text, TouchableOpacity } from 'react-native';
import SearchPanel from './SearchPanel';
import { geocode, geocodeSuggestions } from '../utils/geocode';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mockSetOrigin = jest.fn();
const mockSetDestination = jest.fn();
const mockFetchRoutes = jest.fn();

jest.mock('../context/RouteContext', () => ({
  useRoute: () => ({
    origin: null,
    setOrigin: mockSetOrigin,
    destination: null,
    setDestination: mockSetDestination,
    fetchRoutes: mockFetchRoutes,
    loading: false,
    error: null,
  }),
}));

jest.mock('../utils/geocode', () => ({
  geocode: jest.fn(),
  geocodeSuggestions: jest.fn(),
}));

jest.useFakeTimers();

describe('SearchPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows origin suggestions when typing and calls setOrigin on select', async () => {
    geocodeSuggestions.mockResolvedValueOnce([
      {
        id: 'block_37',
        label: 'Block 37',
        lat: 41.8839,
        lng: -87.6288,
      },
    ]);

    let root;
    await act(async () => {
      root = renderer.create(<SearchPanel />);
    });

    const inputs = root.root.findAllByType(TextInput);
    expect(inputs.length).toBeGreaterThan(0);

    // Type into the origin input
    await act(async () => {
      inputs[0].props.onChangeText('Block');
      jest.runAllTimers();
    });

    // Expect suggestion text to appear
    const suggestionTexts = root.root
      .findAllByType(Text)
      .filter((node) => node.props.children === 'Block 37');

    expect(suggestionTexts.length).toBeGreaterThan(0);

    // Press the suggestion
    const suggestionTouchables = root.root
      .findAllByType(TouchableOpacity)
      .filter(
        (node) =>
          node.props.onPress &&
          node.findAllByType(Text).some((t) => t.props.children === 'Block 37')
      );

    expect(suggestionTouchables.length).toBe(1);

    await act(async () => {
      suggestionTouchables[0].props.onPress();
    });

    expect(mockSetOrigin).toHaveBeenCalledTimes(1);
    expect(mockSetOrigin).toHaveBeenCalledWith(
      expect.objectContaining({
        lat: 41.8839,
        lng: -87.6288,
        label: 'Block 37',
      })
    );
  });

  it('calls fetchRoutes when Find Warm Route button is pressed', async () => {
    geocodeSuggestions.mockResolvedValue([]);

    let root;
    await act(async () => {
      root = renderer.create(<SearchPanel />);
    });

    const buttons = root.root.findAllByType(TouchableOpacity);

    const findRouteButton = buttons.find((button) =>
      button
        .findAllByType(Text)
        .some((t) => t.props.children === '🔍 Find Warm Route')
    );

    expect(findRouteButton).toBeTruthy();

    await act(async () => {
      findRouteButton.props.onPress();
    });

    expect(mockFetchRoutes).toHaveBeenCalledTimes(1);
  });
});

