
import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import './index.css';

function App() {
  const [voteData, setVoteData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [userLocationStatus, setUserLocationStatus] = useState('Location not detected');
  const [routeInfo, setRouteInfo] = useState(null);
  const [selectedCentreId, setSelectedCentreId] = useState(null);
  const [mapType, setMapType] = useState('roadmap');
  // Area Filtering
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState('');

  const mapContainerRef = useRef(null);
  const mapInstance = useRef(null);
  const markersRef = useRef([]);
  const userMarkerRef = useRef(null);
  const directionsService = useRef(null);
  const directionsRenderer = useRef(null);

  // Class References (loaded dynamically)
  const CustomMarkerClass = useRef(null);
  const UserLocationMarkerClass = useRef(null);

  // 1. Initialize Map
  useEffect(() => {
    const initMap = async () => {
      if (mapInstance.current) return;
      
      // Wait for Google API
      const google = await window.googleMapsLoaded;

      // Define Custom Classes
      class CustomMarker extends google.maps.OverlayView {
           constructor(position, content, map, onClick) {
               super();
               this.position = position;
               this.content = content;
               this.markerDiv = null;
               this.onClick = onClick;
               this.setMap(map);
           }
           onAdd() {
               const div = document.createElement('div');
               div.className = 'numbered-marker';
               div.textContent = this.content;
               div.addEventListener('click', (e) => {
                   e.stopPropagation();
                   if (this.onClick) this.onClick();
               });
               // Prevent map clicks
               google.maps.OverlayView.preventMapHitsAndGesturesFrom(div);
               this.getPanes().overlayMouseTarget.appendChild(div);
               this.markerDiv = div;
           }
           draw() {
               if (!this.markerDiv || !this.position) return;
               const point = this.getProjection().fromLatLngToDivPixel(this.position);
               if (point) {
                   this.markerDiv.style.left = point.x + 'px';
                   this.markerDiv.style.top = point.y + 'px';
               }
           }
           onRemove() {
               if (this.markerDiv) {
                   this.markerDiv.remove();
                   this.markerDiv = null;
               }
           }
           setHighlight(isHighlighted) {
               if (this.markerDiv) {
                   if (isHighlighted) this.markerDiv.classList.add('highlighted');
                   else this.markerDiv.classList.remove('highlighted');
               }
           }
       }
       CustomMarkerClass.current = CustomMarker;

       class UserLocationMarker extends google.maps.OverlayView {
           constructor(position, map) {
               super(); this.position = position; this.div = null; this.setMap(map);
           }
           onAdd() {
               this.div = document.createElement('div');
               this.div.className = 'user-marker';
               this.getPanes().overlayMouseTarget.appendChild(this.div);
           }
           draw() {
               if (!this.div || !this.position) return;
               const point = this.getProjection().fromLatLngToDivPixel(this.position);
               this.div.style.left = point.x + 'px'; this.div.style.top = point.y + 'px';
               // Center
               this.div.style.transform = 'translate(-50%, -50%)'; 
           }
           onRemove() { if (this.div) this.div.remove(); }
       }
       UserLocationMarkerClass.current = UserLocationMarker;

       // Create Map
       const map = new google.maps.Map(mapContainerRef.current, {
           zoom: 12,
           center: { lat: 23.0150, lng: 91.3967 }, // Feni
           disableDefaultUI: true,
           zoomControl: true,
           styles: [
               { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
           ]
       });
       mapInstance.current = map;

       // Directions
       directionsService.current = new google.maps.DirectionsService();
       directionsRenderer.current = new google.maps.DirectionsRenderer({
           map: map,
           suppressMarkers: true,
           polylineOptions: { strokeColor: '#2563eb', strokeWeight: 6, strokeOpacity: 0.8 }
       });

       // Now load data
       loadVoteData();
       // Auto locate (silent)
       locateUser(false);
    };

    initMap();
  }, []);

  // 2. Load Data from Supabase
  const loadVoteData = async () => {
      try {
          const { data, error } = await supabase
              .from('vote_centre')
              .select('*')
              .order('vote_centre_code', { ascending: true });
          
          if (error) throw error;
          
          const processed = data.map(d => {
               const coords = getCoordinates(d);
               return { ...d, coords };
          }).filter(d => d.coords !== null);

          setVoteData(processed);
          
          // Extract Unique Areas
          const uniqueAreas = [...new Set(processed.map(p => 
              p.vote_centre_area ? p.vote_centre_area.trim() : 'Unknown'
          ))].sort();
          setAreas(uniqueAreas);
          
          setLoading(false);
      } catch (err) {
          console.error(err);
          setLoading(false); // maybe set error state
      }
  };

  const getCoordinates = (centre) => {
      // Logic reused
      if (centre.location_latitude_longitude) {
          const parts = centre.location_latitude_longitude.split(',').map(Number);
          if (parts.length === 2 && !isNaN(parts[0])) return { lat: parts[0], lng: parts[1] };
      }
      if (centre.location_url) {
          const match = centre.location_url.match(/!3d(-?\d+\.\d+).*!4d(-?\d+\.\d+)/);
          if (match) return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
          const qMatch = centre.location_url.match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
          if(qMatch) return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
      }
      return null;
  };

  // Filter Logic (Moved up to use in Effect)
  const filteredData = voteData.filter(item => {
      const matchSearch = (item.vote_centre_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.vote_centre_area || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemArea = item.vote_centre_area ? item.vote_centre_area.trim() : 'Unknown';
      const matchArea = selectedArea ? itemArea === selectedArea : true;
      
      return matchSearch && matchArea;
  });

  // 3. Render Markers when data changes
  useEffect(() => {
      if (!mapInstance.current || !CustomMarkerClass.current) return;

      // Clear old
      markersRef.current.forEach(m => m.setMap(null));
      markersRef.current = [];

      const bounds = new window.google.maps.LatLngBounds();

      filteredData.forEach(item => {
          const marker = new CustomMarkerClass.current(
             item.coords,
             item.vote_centre_code,
             mapInstance.current,
             () => handleSelectCentre(item.vote_centre_iid)
          );
          marker._id = item.vote_centre_iid;
          markersRef.current.push(marker);
          bounds.extend(item.coords);
      });

      if (!bounds.isEmpty()) {
          mapInstance.current.fitBounds(bounds);
      }
  }, [filteredData]);

  // 4. Interaction Handlers
  const handleSelectCentre = (id) => {
      setSelectedCentreId(id);
      
      // Highlight Marker
      markersRef.current.forEach(m => {
          if (m.setHighlight) m.setHighlight(m._id === id);
      });

      // Pan Map
      const item = voteData.find(d => d.vote_centre_iid === id);
      if (item && mapInstance.current) {
          mapInstance.current.panTo(item.coords);
          mapInstance.current.setZoom(15);
      }
      
      // Scroll list item into view
      const el = document.getElementById(`card-${id}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const locateUser = (zoom = true) => {
      if (!navigator.geolocation) {
          setUserLocationStatus('Not supported');
          return;
      }
      setUserLocationStatus('Locating...');
      navigator.geolocation.getCurrentPosition(
          (pos) => {
              const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setUserLocation(loc);
              setUserLocationStatus('Location found');
              
              if (mapInstance.current && UserLocationMarkerClass.current) {
                  if (userMarkerRef.current) userMarkerRef.current.setMap(null);
                  userMarkerRef.current = new UserLocationMarkerClass.current(loc, mapInstance.current);
                  if (zoom) {
                      mapInstance.current.panTo(loc);
                      mapInstance.current.setZoom(14);
                  }
              }
          },
          (err) => {
              console.error(err);
              setUserLocationStatus('Denied/Error');
          },
          { enableHighAccuracy: true }
      );
  };

  const routeToCentre = (id) => {
      const item = voteData.find(d => d.vote_centre_iid === id);
      if (!item) return;

      if (!userLocation) {
          alert("Please find your location first.");
          locateUser(true);
          return;
      }

      handleSelectCentre(id);

      const request = {
          origin: userLocation,
          destination: item.coords,
          travelMode: window.google.maps.TravelMode.DRIVING
      };

      const handleResult = (res, mode) => {
          directionsRenderer.current.setDirections(res);
          const leg = res.routes[0].legs[0];
          setRouteInfo({
              distance: leg.distance.text,
              duration: leg.duration.text,
              mode: mode
          });
      };

      directionsService.current.route(request, (result, status) => {
          if (status === 'OK') {
              handleResult(result, 'Driving');
          } else {
              // Try walking
              const msg = `Driving route not found (${status}). Trying walking...`;
              console.log(msg);
              directionsService.current.route({
                  ...request, travelMode: window.google.maps.TravelMode.WALKING
              }, (wRes, wStatus) => {
                  if (wStatus === 'OK') {
                      handleResult(wRes, 'Walking');
                  } else {
                      if(confirm("Route not found on map. Open Google Maps App?")) {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coords.lat},${item.coords.lng}`;
                          window.open(url, '_blank');
                      }
                  }
              });
          }
      });
  };

  const findNearestAndRoute = () => {
      if (!userLocation) {
          alert('Please locate yourself first!');
          locateUser(true);
          return;
      }
      
      let closest = null;
      let minD = Infinity;

      voteData.forEach(p => {
          const d = haversine(userLocation, p.coords);
          if (d < minD) { minD = d; closest = p; }
      });

      if (closest) {
          routeToCentre(closest.vote_centre_iid);
      }
  };

  const haversine = (c1, c2) => {
      const R = 6371; 
      const dLat = (c2.lat - c1.lat) * Math.PI / 180;
      const dLon = (c2.lng - c1.lng) * Math.PI / 180;
      const a = Math.sin(dLat/2)*Math.sin(dLat/2) +
                Math.cos(c1.lat*Math.PI/180)*Math.cos(c2.lat*Math.PI/180) *
                Math.sin(dLon/2)*Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
  };

  const clearRoute = () => {
      if (directionsRenderer.current) {
          directionsRenderer.current.setDirections({ routes: [] });
      }
      setRouteInfo(null);
  };

  const openExternalMap = () => {
      const item = voteData.find(d => d.vote_centre_iid === selectedCentreId);
      if (item) {
          const url = `https://www.google.com/maps/dir/?api=1&destination=${item.coords.lat},${item.coords.lng}`;
          window.open(url, '_blank');
      }
  }



  const toggleMapType = (type) => {
      setMapType(type);
      if (mapInstance.current) mapInstance.current.setMapTypeId(type);
  }

  // Mobile Bottom Sheet Logic
  const [sheetHeight, setSheetHeight] = useState('45vh');
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);
  const sidebarRef = useRef(null);

  const handleTouchStart = (e) => {
    setIsDragging(true);
    dragStartY.current = e.touches[0].clientY;
    dragStartHeight.current = sidebarRef.current.getBoundingClientRect().height;
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - e.touches[0].clientY; // Up is positive (increase height)
    const newH = dragStartHeight.current + deltaY;
    
    // Limits
    const maxH = window.innerHeight * 0.95;
    const minH = 120; // Enough for handle + search
    
    if (newH >= minH && newH <= maxH) {
         setSheetHeight(`${newH}px`);
    }
  };

  const handleTouchEnd = () => {
      setIsDragging(false);
      const h = sidebarRef.current.offsetHeight;
      const windowH = window.innerHeight;
      
      const small = 150; 
      const medium = windowH * 0.45;
      const large = windowH * 0.9;

      const dists = [Math.abs(h - small), Math.abs(h - medium), Math.abs(h - large)];
      const minD = Math.min(...dists);
      
      if (minD === dists[0]) setSheetHeight(`${small}px`);
      else if (minD === dists[1]) setSheetHeight(`${medium}px`);
      else setSheetHeight(`${large}px`);
  };


  return (
    <>
      <header className="app-header">
         <div className="app-title">
             <i className="ph ph-map-trifold" style={{fontSize: 24, color:'var(--primary)'}}></i>
             Vote Centre Map
         </div>
         <div style={{fontSize:'0.8rem', color:'var(--text-sub)'}}>
             <span>● Live</span>
         </div>
      </header>

      <div className="main-content">
          <div className="map-container">
               <div ref={mapContainerRef} id="map-view"></div>
               
               {/* Toggles */}
               <div className="map-toggles">
                   <div className={`chip ${mapType==='roadmap'?'active':''}`} onClick={()=>toggleMapType('roadmap')}>Road Map</div>
                   <div className={`chip ${mapType==='satellite'?'active':''}`} onClick={()=>toggleMapType('satellite')}>Satellite</div>
               </div>

               {/* Route Panel */}
               {routeInfo && (
                   <div className="route-panel">
                       <i className="ph ph-car-profile" style={{fontSize:24}}></i>
                       <div>
                           <div style={{color:'var(--primary)', fontSize:'1.1rem'}}>{routeInfo.distance}</div>
                           <div style={{fontSize:'0.85rem', color:'#666'}}>{routeInfo.duration} ({routeInfo.mode})</div>
                       </div>
                       <button className="btn btn-primary btn-sm" onClick={openExternalMap}>
                           <i className="ph ph-arrow-square-out"></i> Go
                       </button>
                       <button className="btn btn-outline btn-sm" style={{border:'none', padding:4}} onClick={clearRoute}>
                           <i className="ph ph-x" style={{fontSize:18}}></i>
                       </button>
                   </div>
               )}
          </div>

          <aside 
            className={`sidebar ${isDragging ? 'dragging' : ''}`}
            ref={sidebarRef}
            style={{ height: window.innerWidth <= 768 ? sheetHeight : undefined }}
          >   
              {/* Drag Handle */}
              <div 
                className="drag-handle-container"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              >
                  <div className="drag-handle"></div>
              </div>

              <div className="controls">
                  <div className="search-box">
                      <i className="ph ph-magnifying-glass search-icon"></i>
                      <input 
                         type="text" 
                         className="search-input" 
                         placeholder="Search centre..."
                         value={searchTerm}
                         onChange={e => setSearchTerm(e.target.value)}
                         style={{marginBottom:8}}
                      />
                      
                      {/* Area Filter Dropdown */}
                      <select 
                        className="search-input" 
                        value={selectedArea} 
                        onChange={e => setSelectedArea(e.target.value)}
                        style={{paddingLeft:12}} // Reduce padding as it has no icon
                      >
                          <option value="">All Areas</option>
                          {areas.map(a => (
                              <option key={a} value={a}>{a}</option>
                          ))}
                      </select>
                  </div>
                  <div className="action-row">
                      <button className="btn btn-accent" onClick={findNearestAndRoute}>
                          <i className="ph ph-police-car"></i> Duty
                      </button>
                      <button className="btn btn-primary" onClick={() => locateUser(true)}>
                          <i className="ph ph-crosshair"></i> Me
                      </button>
                  </div>
                  <div style={{marginTop:8, fontSize:'0.8rem', color:'var(--text-sub)', textAlign:'center'}}>
                      {userLocationStatus}
                  </div>
              </div>

              <div className="results-list">
                  {loading ? (
                      <div className="loader">
                          <i className="ph ph-spinner-gap spin" style={{fontSize:32}}></i>
                          <p>Loading...</p>
                      </div>
                  ) : filteredData.length === 0 ? (
                      <div style={{padding:20, textAlign:'center', color:'#888'}}>No results found.</div>
                  ) : (
                      filteredData.map(item => (
                          <div 
                             key={item.vote_centre_iid}
                             id={`card-${item.vote_centre_iid}`}
                             className={`place-card ${selectedCentreId === item.vote_centre_iid ? 'active':''}`}
                             onClick={() => handleSelectCentre(item.vote_centre_iid)}
                          >
                              <div className="place-title">{item.vote_centre_name}</div>
                              <div className="place-meta">
                                  <i className="ph ph-hash"></i> {item.vote_centre_code}
                                  <span style={{color:'#ccc', margin:'0 4px'}}>|</span>
                                  <i className="ph ph-map-pin"></i> {item.vote_centre_area}
                              </div>
                              <div className="place-actions">
                                  <button className="btn btn-outline btn-sm" onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectCentre(item.vote_centre_iid);
                                  }}>
                                      View
                                  </button>
                                  <button className="btn btn-primary btn-sm" onClick={(e) => {
                                      e.stopPropagation();
                                      routeToCentre(item.vote_centre_iid);
                                  }}>
                                      <i className="ph ph-arrow-bend-up-right"></i> Directions
                                  </button>
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </aside>
      </div>
    </>
  );
}

export default App;
