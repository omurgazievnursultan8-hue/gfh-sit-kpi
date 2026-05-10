package kg.gfh.kpi.service;

import kg.gfh.kpi.entity.SystemSetting;
import kg.gfh.kpi.exception.ApiException;
import kg.gfh.kpi.repository.SystemSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SystemSettingService {

    private final SystemSettingRepository repo;

    public List<SystemSetting> findAll() {
        return repo.findAll();
    }

    public String getValue(String key) {
        return repo.findById(key)
            .map(SystemSetting::getValue)
            .orElseThrow(() -> new ApiException("SETTING_NOT_FOUND",
                "Настройка не найдена: " + key, "Жөндөмө табылган жок: " + key));
    }

    public String getValueOrDefault(String key, String defaultValue) {
        return repo.findById(key).map(SystemSetting::getValue).orElse(defaultValue);
    }

    @Transactional
    public SystemSetting update(String key, String value) {
        SystemSetting s = repo.findById(key)
            .orElseThrow(() -> new ApiException("SETTING_NOT_FOUND",
                "Настройка не найдена: " + key, "Жөндөмө табылган жок: " + key));
        s.setValue(value);
        return repo.save(s);
    }
}
