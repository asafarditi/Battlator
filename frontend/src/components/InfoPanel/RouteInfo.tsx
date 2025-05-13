
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RouteInfoProps } from '@/types';
import { Ruler, TrendingUp, AlertCircle, Eye } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const RouteInfo: React.FC<RouteInfoProps> = ({ route, vantagePoint, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="w-full bg-card text-card-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg animate-pulse">Calculating...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 bg-muted rounded animate-pulse"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-muted rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!route && !vantagePoint) {
    return (
      <Card className="w-full bg-card text-card-foreground">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Route Information</CardTitle>
          <CardDescription>
            Set start and end points, then calculate a route to see details here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground">
          No route or vantage point data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-card text-card-foreground">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Route Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {route && (
            <>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Ruler className="h-4 w-4 text-tactical-green" />
                    Distance
                  </div>
                  <span className="text-sm font-bold">{route.distance} km</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <TrendingUp className="h-4 w-4 text-tactical-yellow" />
                    Elevation Gain
                  </div>
                  <span className="text-sm font-bold">{route.elevation} m</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <AlertCircle className="h-4 w-4 text-tactical-red" />
                      Risk Score
                    </div>
                    <span className="text-sm font-bold">{route.riskScore}/100</span>
                  </div>
                  <Progress 
                    value={route.riskScore} 
                    max={100} 
                    className="h-2"
                    indicatorClassName={`${
                      route.riskScore > 70 ? 'bg-tactical-red' :
                      route.riskScore > 40 ? 'bg-tactical-orange' :
                      'bg-tactical-green'
                    }`}
                  />
                </div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="text-xs text-muted-foreground">
                  Route ID: {route.id.slice(0, 8)}...
                </div>
              </div>
            </>
          )}
          
          {vantagePoint && (
            <div className="space-y-3 pt-2">
              <div className="text-sm font-medium flex items-center gap-1">
                <Eye className="h-4 w-4 text-tactical-lightBlue" />
                Vantage Point
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Position:</span>
                  <span>{vantagePoint.position.lat.toFixed(6)}, {vantagePoint.position.lng.toFixed(6)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Coverage Score:</span>
                  <span>{vantagePoint.coverageScore}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RouteInfo;
