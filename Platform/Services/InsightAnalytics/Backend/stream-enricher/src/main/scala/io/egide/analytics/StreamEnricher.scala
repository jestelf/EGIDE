package io.egide.analytics

import org.apache.flink.api.common.eventtime.WatermarkStrategy
import org.apache.flink.streaming.api.scala._

case class CustomerEvent(id: String, product: String, riskScore: Double)
case class EnrichedEvent(id: String, product: String, riskScore: Double, taxonomy: String)

object StreamEnricher {
  def main(args: Array[String]): Unit = {
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    val stream = env.fromCollection(Seq(
      CustomerEvent("1", "loans", 0.2),
      CustomerEvent("2", "cards", 0.5)
    )).assignTimestampsAndWatermarks(WatermarkStrategy.noWatermarks())

    val enriched = stream.map(event => enrich(event))
    enriched.print()

    env.execute("insight-analytics-stream-enricher")
  }

  def enrich(event: CustomerEvent): EnrichedEvent = {
    val taxonomy = event.product match {
      case "loans" => "credit"
      case "cards" => "payments"
      case _ => "other"
    }
    EnrichedEvent(event.id, event.product, event.riskScore, taxonomy)
  }
}
