'use client';
import { Button, FormControl, FormLabel, Input, useToast } from '@chakra-ui/react';
import { useAuthContext } from '../context/authContext';
import ControlButton from './ControlButton';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_API_BASE_URL = 'http://213.199.35.129:5002';
const apiBaseUrl = (
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === 'string'
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : DEFAULT_API_BASE_URL
).replace(/\/+$/, '');
const RADIATION_ENDPOINT = `${apiBaseUrl}/api/radiation`;

export const Control = () => {
  const [data, setData] = useState({});
  const [thresholds, setThresholds] = useState({ HLD: '', LLD: '' });
  const [isSendingThresholds, setIsSendingThresholds] = useState(false);
  const toast = useToast();
  const { token } = useAuthContext();

  const showToast = useCallback(
    (id, options) => {
      if (!toast.isActive(id)) {
        toast({
          id,
          duration: 5000,
          isClosable: true,
          position: 'bottom',
          ...options,
        });
      }
    },
    [toast]
  );

  useEffect(() => {
    const socket = new WebSocket("ws://213.199.35.129:5002");

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const latestData = JSON.parse(event.data);
        setData(latestData); // Update data with incoming WebSocket data
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      console.log("Close event code:", event.code);
      console.log("Close event reason:", event.reason);
    };

    return () => {
      socket.close();
    };
  }, [token]);

  const handleThresholdChange = useCallback(
    (field) => (event) => {
      const { value } = event.target;
      setThresholds((previous) => ({ ...previous, [field]: value }));
    },
    []
  );

  const handleThresholdSubmit = useCallback(
    async (event) => {
      event.preventDefault();

      if (!token) {
        showToast('control-threshold-auth', {
          title: 'Authentication required',
          description: 'You must be signed in to send HLD and LLD values.',
          status: 'error',
        });
        return;
      }

      if (thresholds.HLD === '' || thresholds.LLD === '') {
        showToast('control-threshold-missing', {
          title: 'All fields are required',
          description: 'Please provide both HLD and LLD values before sending.',
          status: 'warning',
        });
        return;
      }

      const parsedHLD = Number(thresholds.HLD);
      const parsedLLD = Number(thresholds.LLD);

      if (Number.isNaN(parsedHLD) || Number.isNaN(parsedLLD)) {
        showToast('control-threshold-invalid', {
          title: 'Invalid values',
          description: 'HLD and LLD must be valid numeric values.',
          status: 'error',
        });
        return;
      }

      setIsSendingThresholds(true);

      try {
        const response = await fetch(RADIATION_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ Vhaut: parsedHLD, Vbas: parsedLLD }),
        });

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null);
          const errorMessage = errorBody?.message || 'Unexpected error sending control values.';
          throw new Error(errorMessage);
        }

        toast({
          title: 'Values sent successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'bottom',
        });
        setThresholds({ HLD: '', LLD: '' });
      } catch (error) {
        console.error('Error sending control values:', error);
        showToast('control-threshold-error', {
          title: 'Failed to send values',
          description: error.message,
          status: 'error',
        });
      } finally {
        setIsSendingThresholds(false);
      }
    },
    [showToast, thresholds.HLD, thresholds.LLD, toast, token]
  );

  const cpsValue = useMemo(() => {
    const value =
      data?.CPS ??
      data?.cps ??
      data?.Comptage ??
      data?.comptage ??
      data?.pps ??
      data?.PPS ??
      null;
    return value;
  }, [data]);

  const picValue = useMemo(() => {
    const value = data?.pic ?? data?.Pic ?? data?.PIC ?? null;
    return value;
  }, [data]);

  const formatDisplayValue = useCallback((value) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return value.toLocaleString();
    }

    return value;
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Control</h1>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          onSubmit={handleThresholdSubmit}
          className="rounded-lg border bg-white p-4 shadow-sm"
        >
          <h2 className="text-xl font-semibold">Control</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configurez les seuils HLD et LLD puis cliquez sur « Send » pour appliquer vos changements.
          </p>
          <div className="mt-4 space-y-4">
            <FormControl>
              <FormLabel>HLD</FormLabel>
              <Input
                type="number"
                value={thresholds.HLD}
                onChange={handleThresholdChange('HLD')}
                placeholder="Entrez la valeur HLD"
              />
            </FormControl>
            <FormControl>
              <FormLabel>LLD</FormLabel>
              <Input
                type="number"
                value={thresholds.LLD}
                onChange={handleThresholdChange('LLD')}
                placeholder="Entrez la valeur LLD"
              />
            </FormControl>
          </div>
          <Button
            type="submit"
            colorScheme="blue"
            isLoading={isSendingThresholds}
            loadingText="Sending"
            className="mt-4 w-full"
          >
            Send
          </Button>
        </form>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Indicator</h2>
          <p className="mt-1 text-sm text-gray-500">
            Surveillez les valeurs de comptage CPS et le pic en temps réel.
          </p>
          <div className="mt-4 space-y-3 text-lg">
            <p>
              <span className="font-semibold">Comptage CPS:&nbsp;</span>
              {formatDisplayValue(cpsValue)}
            </p>
            <p>
              <span className="font-semibold">Pic:&nbsp;</span>
              {formatDisplayValue(picValue)}
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons Section */}
      <div className="flex justify-center w-full mt-2">
        <div className="grid grid-cols-2 gap-1 place-items-center max-w-lg">
          <ControlButton field="Elv1" isOn={data["Elv1"] === 1} />
          <ControlButton field="Elv2" isOn={data["Elv2"] === 1} />
          <ControlButton field="Elv3" isOn={data["Elv4"] === 1} />
          <ControlButton field="Elv4" isOn={data["Elv5"] === 1} />
          <ControlButton field="Elv5" isOn={data["Elv6"] === 1} />
          <ControlButton field="Elv6" isOn={data["Elv7"] === 1} />
        </div>
      </div>

      {/* Real-time Measurements Section */}
      <div className="grid grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-1">
          {Object.keys(data).length === 0 ? (
            <p>No data available</p>
          ) : (
            Object.keys(data).map((key, index) => {
              if (key.startsWith("Elv") || key.startsWith("F")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>
                        Status{" "}
                        <a
                          href={`#${key.toLocaleLowerCase()}`}
                          className="text-blue-500"
                        >
                          {key}
                        </a>
                      </h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key] == 1 ? "ON" : "OFF"}
                    </h2>
                  </div>
                );
              } else {
                return null;
              }
            })
          )}
        </div>
      </div>
    </div>
  );
};
