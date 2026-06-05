-- AlterTable
ALTER TABLE "Car" ADD COLUMN "assignedEventId" TEXT;

-- CreateIndex
CREATE INDEX "Car_assignedEventId_idx" ON "Car"("assignedEventId");

-- AddForeignKey
ALTER TABLE "Car" ADD CONSTRAINT "Car_assignedEventId_fkey" FOREIGN KEY ("assignedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "CarAssignment" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "driverId" TEXT,
    "eventId" TEXT,
    "startDate" TEXT,
    "endDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CarAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarAssignment_carId_idx" ON "CarAssignment"("carId");

-- CreateIndex
CREATE INDEX "CarAssignment_driverId_idx" ON "CarAssignment"("driverId");

-- CreateIndex
CREATE INDEX "CarAssignment_eventId_idx" ON "CarAssignment"("eventId");

-- CreateIndex
CREATE INDEX "CarAssignment_createdAt_idx" ON "CarAssignment"("createdAt");

-- AddForeignKey
ALTER TABLE "CarAssignment" ADD CONSTRAINT "CarAssignment_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarAssignment" ADD CONSTRAINT "CarAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CarAssignment" ADD CONSTRAINT "CarAssignment_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
