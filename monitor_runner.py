#!/usr/bin/env python3
"""
TRON Transaction Monitor Runner
Standalone service for monitoring TRON blockchain transactions
"""

import asyncio
import logging
import os
import signal
import sys
from pathlib import Path

# Add the backend directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

from backend.tron_monitor import start_tron_monitoring, stop_tron_monitoring

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('/app/logs/monitor.log') if os.path.exists('/app/logs') else logging.NullHandler()
    ]
)

logger = logging.getLogger(__name__)

class MonitorService:
    def __init__(self):
        self.running = False
        self.monitor_task = None
    
    async def start(self):
        """Start the monitoring service"""
        self.running = True
        logger.info("Starting TRON Monitor Service...")
        
        try:
            # Start monitoring
            self.monitor_task = asyncio.create_task(start_tron_monitoring())
            await self.monitor_task
            
        except asyncio.CancelledError:
            logger.info("Monitor service cancelled")
        except Exception as e:
            logger.error(f"Monitor service error: {e}")
        finally:
            await self.stop()
    
    async def stop(self):
        """Stop the monitoring service"""
        if not self.running:
            return
        
        self.running = False
        logger.info("Stopping TRON Monitor Service...")
        
        try:
            await stop_tron_monitoring()
            
            if self.monitor_task and not self.monitor_task.done():
                self.monitor_task.cancel()
                try:
                    await self.monitor_task
                except asyncio.CancelledError:
                    pass
                    
        except Exception as e:
            logger.error(f"Error stopping monitor service: {e}")
        
        logger.info("TRON Monitor Service stopped")

# Global service instance
service = MonitorService()

def signal_handler():
    """Handle shutdown signals"""
    logger.info("Received shutdown signal")
    if service.running:
        # Create a new event loop for cleanup if current one is closed
        try:
            loop = asyncio.get_event_loop()
            if loop.is_closed():
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
            
            loop.run_until_complete(service.stop())
        except Exception as e:
            logger.error(f"Error during shutdown: {e}")
    
    sys.exit(0)

async def main():
    """Main function"""
    # Setup signal handlers
    if sys.platform != 'win32':
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, lambda s, f: signal_handler())
    
    try:
        await service.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        await service.stop()
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        await service.stop()
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        pass
    except Exception as e:
        logger.error(f"Failed to start monitor service: {e}")
        sys.exit(1)
