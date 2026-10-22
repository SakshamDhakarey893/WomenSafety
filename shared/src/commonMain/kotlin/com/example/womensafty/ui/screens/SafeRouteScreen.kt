package com.example.womensafty.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.platform.LocalUriHandler
import com.example.womensafty.model.SafetyZoneItem
import com.example.womensafty.state.AppState
import com.example.womensafty.ui.theme.*

@Composable
fun SafeRouteScreen(
    appState: AppState,
    modifier: Modifier = Modifier
) {
    val scrollState = rememberScrollState()
    val uriHandler = LocalUriHandler.current
    var destinationInput by remember { mutableStateOf("University Central Library") }
    var selectedRouteId by remember { mutableStateOf("route-b") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp)
    ) {
        Text(
            text = "Safe Route Navigation",
            fontSize = 20.sp,
            fontWeight = FontWeight.Bold
        )
        Text(
            text = "Prioritizing well-lit roads, police surveillance, and lower incident zones.",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Origin and Destination Card
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            shape = RoundedCornerShape(14.dp)
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🟢", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Current: ${appState.currentAddress}",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🎯", fontSize = 12.sp)
                    Spacer(modifier = Modifier.width(8.dp))
                    OutlinedTextField(
                        value = destinationInput,
                        onValueChange = { destinationInput = it },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        singleLine = true,
                        label = { Text("Destination", fontSize = 11.sp) }
                    )
                }
            }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Interactive Tactical Route Map Canvas with Google Maps Navigation
        InteractiveRouteMapCanvas(
            selectedRouteId = selectedRouteId,
            onOpenGoogleMaps = {
                val mapsUrl = "https://www.google.com/maps/dir/?api=1&origin=${appState.currentGpsLat},${appState.currentGpsLng}&destination=28.5355,77.3910&travelmode=walking"
                try {
                    uriHandler.openUri(mapsUrl)
                } catch (_: Exception) {}
            }
        )

        Spacer(modifier = Modifier.height(18.dp))

        // Route Comparison Cards
        Text(
            text = "COMPARE CALCULATED ROUTES",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(10.dp))

        // Route B (Recommended Safe Route)
        RouteCard(
            title = "Route B: Recommended Safer Route",
            isRecommended = true,
            distance = "6.0 km",
            time = "19 mins",
            safetyScore = 76.0f,
            riskLabel = "LOW RISK (SAFER)",
            points = listOf(
                "Fully illuminated arterial avenues with CCTV coverage",
                "Continuous police patrol coverage & women safety booth",
                "64% lower historical incident density compared to Route A"
            ),
            isSelected = selectedRouteId == "route-b",
            onClick = { selectedRouteId = "route-b" }
        )

        Spacer(modifier = Modifier.height(12.dp))

        // Route A (Shortest Route)
        RouteCard(
            title = "Route A: Shortest Route",
            isRecommended = false,
            distance = "5.2 km",
            time = "18 mins",
            safetyScore = 31.5f,
            riskLabel = "HIGHER RISK",
            points = listOf(
                "Passes through 2 low-lit railway underpasses",
                "12 safety incidents reported in past 30 days",
                "Sparse pedestrian density after 9 PM"
            ),
            isSelected = selectedRouteId == "route-a",
            onClick = { selectedRouteId = "route-a" }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Disclaimer Alert
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(12.dp)
        ) {
            Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.Top) {
                Text(text = "ℹ️", fontSize = 16.sp)
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Safety scores are statistical estimates based on historical incident reports and urban density. They are not guarantees. Always contact emergency services (112) if you feel threatened.",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 16.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Area Safety Zones Overview
        Text(
            text = "AREA SAFETY ZONES NEARBY",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(10.dp))

        appState.safetyZones.forEach { zone ->
            SafetyZoneCard(zone = zone)
            Spacer(modifier = Modifier.height(8.dp))
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Community Safety Alerts Feed
        Text(
            text = "ANONYMIZED COMMUNITY SAFETY ALERTS",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            letterSpacing = 1.sp
        )

        Spacer(modifier = Modifier.height(10.dp))

        appState.communityAlerts.forEach { alert ->
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "⚠️ ${alert.approximateArea}",
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                        Text(
                            text = "Category: ${alert.category} • ${alert.timeAgo}",
                            fontSize = 11.sp,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFE11D48).copy(alpha = 0.2f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = alert.safetyLevel,
                            color = Color(0xFFFB7185),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
    }
}

@Composable
fun RouteCard(
    title: String,
    isRecommended: Boolean,
    distance: String,
    time: String,
    safetyScore: Float,
    riskLabel: String,
    points: List<String>,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor = if (isSelected) {
        if (isRecommended) Color(0xFF10B981) else CrimsonPrimary
    } else {
        Color.Transparent
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .border(2.dp, borderColor, RoundedCornerShape(14.dp)),
        colors = CardDefaults.cardColors(
            containerColor = if (isRecommended) Color(0x1A10B981) else Color(0x1AE11D48)
        ),
        shape = RoundedCornerShape(14.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = title,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp
                )
                Box(
                    modifier = Modifier
                        .background(
                            if (isRecommended) Color(0xFF10B981) else CrimsonPrimary,
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = if (isRecommended) "RECOMMENDED" else "SHORTEST",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(text = "📏 $distance", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(text = "⏱️ $time", fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
                Text(
                    text = "🛡️ Safety: ${safetyScore.toInt()}/100",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (isRecommended) Color(0xFF10B981) else CrimsonPrimary
                )
            }

            Spacer(modifier = Modifier.height(10.dp))

            points.forEach { pt ->
                Text(
                    text = "• $pt",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    lineHeight = 15.sp
                )
            }
        }
    }
}

@Composable
fun SafetyZoneCard(zone: SafetyZoneItem) {
    val scoreColor = if (zone.safetyScore >= 75) Color(0xFF10B981) else if (zone.safetyScore >= 50) Color(0xFFF59E0B) else Color(0xFFE11D48)

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier.padding(14.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = zone.name,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp
                )
                Text(
                    text = "Risk: ${zone.riskLevel} | Incidents: ${zone.alertCount}",
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Box(
                modifier = Modifier
                    .background(scoreColor.copy(alpha = 0.18f), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "${zone.safetyScore.toInt()} / 100",
                    color = scoreColor,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun InteractiveRouteMapCanvas(
    selectedRouteId: String,
    onOpenGoogleMaps: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF0F172A))
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "🛰️", fontSize = 14.sp)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "TACTICAL ROUTE MAP CANVAS",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color(0xFF94A3B8),
                        letterSpacing = 1.sp
                    )
                }

                // Interactive Google Maps Launch Button
                FilledTonalButton(
                    onClick = onOpenGoogleMaps,
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = Color(0xFF2563EB),
                        contentColor = Color.White
                    )
                ) {
                    Text(text = "🗺️ Google Maps", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Canvas Drawing
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp)
                    .background(Color(0xFF0B1120), RoundedCornerShape(12.dp))
                    .border(1.dp, Color(0xFF1E293B), RoundedCornerShape(12.dp))
            ) {
                androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
                    val w = size.width
                    val h = size.height

                    // Grid lines (subtle radar aesthetic)
                    val gridColor = Color(0xFF1E293B).copy(alpha = 0.6f)
                    for (x in 0..(w.toInt()) step 50) {
                        drawLine(gridColor, androidx.compose.ui.geometry.Offset(x.toFloat(), 0f), androidx.compose.ui.geometry.Offset(x.toFloat(), h), 1f)
                    }
                    for (y in 0..(h.toInt()) step 40) {
                        drawLine(gridColor, androidx.compose.ui.geometry.Offset(0f, y.toFloat()), androidx.compose.ui.geometry.Offset(w, y.toFloat()), 1f)
                    }

                    val startPoint = androidx.compose.ui.geometry.Offset(w * 0.15f, h * 0.75f)
                    val endPoint = androidx.compose.ui.geometry.Offset(w * 0.85f, h * 0.25f)

                    // Route A: Shortest (Crimson path, slightly arched up)
                    val routeAPath = androidx.compose.ui.graphics.Path().apply {
                        moveTo(startPoint.x, startPoint.y)
                        cubicTo(
                            w * 0.35f, h * 0.40f,
                            w * 0.65f, h * 0.35f,
                            endPoint.x, endPoint.y
                        )
                    }
                    val isRouteA = selectedRouteId == "route-a"
                    drawPath(
                        routeAPath,
                        color = if (isRouteA) Color(0xFFE11D48) else Color(0xFFE11D48).copy(alpha = 0.35f),
                        style = androidx.compose.ui.graphics.drawscope.Stroke(
                            width = if (isRouteA) 5f else 2.5f,
                            pathEffect = if (!isRouteA) androidx.compose.ui.graphics.PathEffect.dashPathEffect(floatArrayOf(12f, 8f)) else null
                        )
                    )

                    // Route B: Recommended Safer Route (Emerald Green path, arched down through lighted avenues)
                    val routeBPath = androidx.compose.ui.graphics.Path().apply {
                        moveTo(startPoint.x, startPoint.y)
                        cubicTo(
                            w * 0.35f, h * 0.85f,
                            w * 0.65f, h * 0.65f,
                            endPoint.x, endPoint.y
                        )
                    }
                    val isRouteB = selectedRouteId == "route-b"
                    drawPath(
                        routeBPath,
                        color = if (isRouteB) Color(0xFF10B981) else Color(0xFF10B981).copy(alpha = 0.35f),
                        style = androidx.compose.ui.graphics.drawscope.Stroke(
                            width = if (isRouteB) 5.5f else 2.5f
                        )
                    )

                    // Intermediate Safety Waypoint Node (Police Booth / CCTV on Route B)
                    val waypointNode = androidx.compose.ui.geometry.Offset(w * 0.50f, h * 0.73f)
                    drawCircle(Color(0xFF10B981), radius = 6f, center = waypointNode)
                    drawCircle(Color(0xFF10B981).copy(alpha = 0.35f), radius = 12f, center = waypointNode)

                    // Risk Waypoint on Route A (Dark Underpass)
                    val riskNode = androidx.compose.ui.geometry.Offset(w * 0.50f, h * 0.37f)
                    drawCircle(Color(0xFFE11D48), radius = 5.5f, center = riskNode)
                    drawCircle(Color(0xFFE11D48).copy(alpha = 0.35f), radius = 11f, center = riskNode)

                    // Start Beacon (Green)
                    drawCircle(Color(0xFF10B981), radius = 8f, center = startPoint)
                    drawCircle(Color(0xFF10B981).copy(alpha = 0.4f), radius = 16f, center = startPoint)

                    // End Beacon (Cyan Target)
                    drawCircle(Color(0xFF38BDF8), radius = 8f, center = endPoint)
                    drawCircle(Color(0xFF38BDF8).copy(alpha = 0.4f), radius = 16f, center = endPoint)
                }

                // Map Legend Overlays
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(Color(0xCC0F172A))
                        .padding(horizontal = 10.dp, vertical = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "🟢 Origin (Current GPS)", fontSize = 10.sp, color = Color(0xFF10B981), fontWeight = FontWeight.Bold)
                    Text(text = "🛡️ Police & CCTV Corridor", fontSize = 10.sp, color = Color(0xFF34D399), fontWeight = FontWeight.SemiBold)
                    Text(text = "🎯 Destination", fontSize = 10.sp, color = Color(0xFF38BDF8), fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}
