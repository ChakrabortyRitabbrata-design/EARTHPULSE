import React, { useEffect, useRef, useState } from 'react';
import * as Cesium from 'cesium';
import './EarthGlobe.css';
import { Crosshair, ZoomIn, ZoomOut, Compass, RotateCcw } from 'lucide-react';

export default function EarthGlobe({
  activeModule = 'glaciers',
  glacierGeoJSON = null,
  thermalGeoJSON = null,
  selectedFeature = null,
  onSelectFeature,
  onClearSelection,
  glacierLayerVisible = true,
  thermalLayerVisible = true,
  loading = false,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const glacierDataSourceRef = useRef(null);
  const thermalDataSourceRef = useRef(null);
  const highlightEntityRef = useRef(null);

  // 1. Initialize Cesium 3D Viewer with Satellite Imagery
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    // Base offline layer guaranteed to render continents and oceans immediately
    const offlineProvider = new Cesium.TileMapServiceImageryProvider({
      url: Cesium.buildModuleUrl('Assets/Textures/NaturalEarthII'),
    });
    const offlineLayer = new Cesium.ImageryLayer(offlineProvider);

    // High-Resolution Satellite layer from Esri World Imagery
    const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
      credit: 'Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community',
    });
    const satelliteLayer = new Cesium.ImageryLayer(satelliteProvider);

    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: offlineLayer,
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      navigationInstructionsInitiallyVisible: false,
      scene3DOnly: true,
      shouldAnimate: true,
    });

    // Add streaming high-res satellite imagery on top of base layer
    viewer.imageryLayers.add(satelliteLayer);

    // Space background, stars, and atmospheric glow
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#020617');
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a1128');
    viewer.scene.globe.showGroundAtmosphere = true;
    viewer.scene.globe.enableLighting = false;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = true;
    }
    if (viewer.scene.skyBox) {
      viewer.scene.skyBox.show = true;
    }

    // Initial camera position (Europe / Eurasia overview)
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(8.5, 46.8, 4800000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-65.0),
        roll: 0.0,
      },
    });

    // Handle Left Click for Entity Picking
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((movement) => {
      const pickedObject = viewer.scene.pick(movement.position);

      if (Cesium.defined(pickedObject) && pickedObject.id && pickedObject.id.properties) {
        const props = {};
        const propertyNames = pickedObject.id.properties.propertyNames;
        for (let i = 0; i < propertyNames.length; i++) {
          const name = propertyNames[i];
          props[name] = pickedObject.id.properties[name]?.getValue();
        }

        let coordinates = [0, 0];
        if (pickedObject.id.position) {
          const carto = Cesium.Cartographic.fromCartesian(
            pickedObject.id.position.getValue(Cesium.JulianDate.now())
          );
          coordinates = [Cesium.Math.toDegrees(carto.longitude), Cesium.Math.toDegrees(carto.latitude)];
        } else if (props.longitude && props.latitude) {
          coordinates = [Number(props.longitude), Number(props.latitude)];
        }

        const featureName =
          props.name || props.short_name || props.glacier_name || `Feature #${props.id || 'N/A'}`;

        onSelectFeature &&
          onSelectFeature({
            id: props.id || `${coordinates[0]}_${coordinates[1]}`,
            name: featureName,
            country: props.country,
            coordinates,
            properties: props,
            elevation: props.elevation,
            frp: props.frp,
            brightness: props.brightness,
            confidence: props.confidence,
            module: activeModule,
          });
      } else {
        onClearSelection && onClearSelection();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Responsive Canvas Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (viewer && !viewer.isDestroyed()) {
        viewer.resize();
      }
    });
    resizeObserver.observe(containerRef.current);

    viewerRef.current = viewer;

    return () => {
      resizeObserver.disconnect();
      handler.destroy();
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // 2. Render Glacier Layer (Cyan Markers)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (glacierDataSourceRef.current) {
      viewer.dataSources.remove(glacierDataSourceRef.current, true);
      glacierDataSourceRef.current = null;
    }

    if (!glacierLayerVisible || !glacierGeoJSON || !glacierGeoJSON.features) return;

    Cesium.GeoJsonDataSource.load(glacierGeoJSON, {
      clampToGround: true,
    })
      .then((ds) => {
        glacierDataSourceRef.current = ds;
        viewer.dataSources.add(ds);

        const cyanColor = Cesium.Color.fromCssColorString('#06b6d4');
        const outlineColor = Cesium.Color.fromCssColorString('#ffffff');

        ds.entities.values.forEach((entity) => {
          if (entity.billboard) entity.billboard = undefined;

          entity.point = new Cesium.PointGraphics({
            color: cyanColor,
            pixelSize: 8,
            outlineColor: outlineColor,
            outlineWidth: 1.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
        });
      })
      .catch((err) => console.warn('Glacier GeoJSON render warning:', err));
  }, [glacierGeoJSON, glacierLayerVisible]);

  // 3. Render Thermal Anomaly Layer (Amber/Red scaled by FRP)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (thermalDataSourceRef.current) {
      viewer.dataSources.remove(thermalDataSourceRef.current, true);
      thermalDataSourceRef.current = null;
    }

    if (!thermalLayerVisible || !thermalGeoJSON || !thermalGeoJSON.features) return;

    Cesium.GeoJsonDataSource.load(thermalGeoJSON, {
      clampToGround: true,
    })
      .then((ds) => {
        thermalDataSourceRef.current = ds;
        viewer.dataSources.add(ds);

        const amberColor = Cesium.Color.fromCssColorString('#f59e0b');
        const redColor = Cesium.Color.fromCssColorString('#ef4444');
        const yellowOutline = Cesium.Color.fromCssColorString('#fef08a');

        ds.entities.values.forEach((entity) => {
          if (entity.billboard) entity.billboard = undefined;

          const frp = entity.properties?.frp?.getValue() || 10;
          const isHighFRP = frp >= 50;
          const pixelSize = Math.min(Math.max(6, Math.round(frp / 6)), 16);

          entity.point = new Cesium.PointGraphics({
            color: isHighFRP ? redColor : amberColor,
            pixelSize: pixelSize,
            outlineColor: yellowOutline,
            outlineWidth: 1.5,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          });
        });
      })
      .catch((err) => console.warn('Thermal GeoJSON render warning:', err));
  }, [thermalGeoJSON, thermalLayerVisible]);

  // 4. Selection Boundary and Camera flyTo Animation
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (highlightEntityRef.current) {
      viewer.entities.remove(highlightEntityRef.current);
      highlightEntityRef.current = null;
    }

    if (!selectedFeature || !selectedFeature.coordinates || selectedFeature.coordinates.length < 2) {
      return;
    }

    const [lon, lat] = selectedFeature.coordinates;
    const name = selectedFeature.name || 'Selected Target';
    const isThermal = activeModule === 'thermal' || selectedFeature.module === 'thermal';

    const highlightColor = isThermal
      ? Cesium.Color.fromCssColorString('#f59e0b')
      : Cesium.Color.fromCssColorString('#06b6d4');

    const targetHeight = selectedFeature.height || (isThermal ? 90000.0 : 35000.0);
    const radius = isThermal ? 8000.0 : 3000.0;

    // Glowing Visible Selection Ellipse & Center Reticle
    const highlight = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(lon, lat),
      name: `Highlight: ${name}`,
      ellipse: {
        semiMinorAxis: radius,
        semiMajorAxis: radius,
        material: highlightColor.withAlpha(0.28),
        outline: true,
        outlineColor: highlightColor,
        outlineWidth: 3.0,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
      point: {
        pixelSize: 14,
        color: Cesium.Color.WHITE,
        outlineColor: highlightColor,
        outlineWidth: 3,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      label: {
        text: name.toUpperCase(),
        font: 'bold 11px Inter, sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 3,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cesium.Cartesian2(0, -22),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    highlightEntityRef.current = highlight;

    // Smoothly fly camera to selection
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        lon,
        lat - (targetHeight > 200000 ? 0.8 : 0.08),
        targetHeight
      ),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-50.0),
        roll: 0.0,
      },
      duration: 1.5,
    });
  }, [selectedFeature, activeModule]);

  // Camera Zoom & Reset Controls
  const handleZoom = (factor) => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.zoomIn(viewer.camera.positionCartographic.height * factor);
  };

  const handleResetCamera = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(8.5, 46.8, 4800000.0),
      orientation: {
        heading: Cesium.Math.toRadians(0.0),
        pitch: Cesium.Math.toRadians(-65.0),
        roll: 0.0,
      },
      duration: 1.5,
    });
  };

  return (
    <div className="earth-globe-container">
      {/* Cesium Globe Canvas */}
      <div ref={containerRef} className="earth-globe-canvas" />

      {/* Floating Tactical Status Pill */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-950/90 border border-cyan-800/60 backdrop-blur-md shadow-lg text-[11px] font-mono text-cyan-300 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span>CESIUM 3D SATELLITE ENGINE</span>
          {loading && <span className="text-amber-400 animate-pulse">• SYNCING...</span>}
        </div>

        {selectedFeature && (
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 rounded-lg bg-cyan-950/90 border border-cyan-400/60 backdrop-blur-md text-xs text-white shadow-xl pointer-events-auto">
            <div className="flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="font-semibold truncate max-w-[190px]">{selectedFeature.name}</span>
            </div>
            <button
              onClick={onClearSelection}
              className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Camera Action Buttons */}
      <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-1.5 bg-slate-950/90 border border-slate-800 backdrop-blur-md p-1.5 rounded-lg shadow-xl">
        <button
          onClick={() => handleZoom(0.35)}
          title="Zoom In"
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleZoom(-0.5)}
          title="Zoom Out"
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleResetCamera}
          title="Reset Global View"
          className="p-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded transition-colors"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
