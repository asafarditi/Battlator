import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { RouteInfoProps } from "@/types";
import { Ruler, TrendingUp, AlertCircle, Eye, Shield } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const RouteInfo: React.FC<RouteInfoProps> = ({ route, vantagePoint, isLoading, threatAreas }) => {
  if (isLoading) {
    return (
      <Card className="bg-background/80 backdrop-blur-sm border-border/50">
        <CardContent className="p-3">
          <div className="space-y-2">
            <div className="h-3 bg-muted/50 rounded animate-pulse"></div>
            <div className="h-3 bg-muted/50 rounded animate-pulse w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!route && !vantagePoint) {
    return null;
  }

  return (
    <Card className="bg-background/80 backdrop-blur-sm border-border/50">
      <CardContent className="p-3">
        <div className="space-y-3 text-xs">
          {route && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/40 rounded p-2 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-tactical-green mb-1">
                    <Ruler className="h-3 w-3" />
                    Distance
                  </div>
                  <span className="font-mono font-medium">{route.distance}km</span>
                </div>
                <div className="bg-background/40 rounded p-2 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-tactical-yellow mb-1">
                    <TrendingUp className="h-3 w-3" />
                    Elevation
                  </div>
                  <span className="font-mono font-medium">{route.elevation}m</span>
                </div>
                <div className="bg-background/40 rounded p-2 flex flex-col items-center">
                  <div className="flex items-center gap-1 text-tactical-red mb-1">
                    <AlertCircle className="h-3 w-3" />
                    Risk
                  </div>
                  <span className="font-mono font-medium">{route.riskScore}%</span>
                </div>
              </div>
              <Progress
                value={route.riskScore}
                max={100}
                className="h-1"
                indicatorClassName={`${
                  route.riskScore > 70 ? "bg-tactical-red" : route.riskScore > 40 ? "bg-tactical-orange" : "bg-tactical-green"
                }`}
              />
            </div>
          )}

          {threatAreas.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-tactical-red text-[10px] uppercase font-medium mb-1">
                <Shield className="h-3 w-3" />
                Active Threats
              </div>
              <div className="grid grid-cols-2 gap-1">
                {threatAreas.map((area) => (
                  <div key={area.id} className="bg-background/40 rounded px-2 py-1 flex items-center justify-between">
                    <span className="text-[10px] uppercase">{area.description}</span>
                    <span
                      className={`text-[10px] font-medium ${
                        area.riskLevel === "high"
                          ? "text-tactical-red"
                          : area.riskLevel === "medium"
                          ? "text-tactical-orange"
                          : "text-tactical-green"
                      }`}
                    >
                      {area.riskLevel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {vantagePoint && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-tactical-lightBlue text-[10px] uppercase font-medium mb-1">
                <Eye className="h-3 w-3" />
                Observation Post
              </div>
              <div className="bg-background/40 rounded p-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">GRID REF</span>
                    <span className="font-mono text-[10px]">
                      {vantagePoint.position.lat.toFixed(4)},{vantagePoint.position.lng.toFixed(4)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block">COVERAGE</span>
                    <span className="font-mono text-[10px] text-tactical-lightBlue">{vantagePoint.coverageScore}%</span>
                  </div>
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
